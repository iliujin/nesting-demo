<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import NestingCanvas from './NestingCanvas.vue'
import PiecePreview from './PiecePreview.vue'
import { ApiError, SolverApi, type Job, type RealResult } from '../lib/api'
import { parseInstance } from '../lib/instances'
import { sampleOptions, sampleText } from '../lib/samples'
import { area, numberText } from '../lib/geometry'
import { download, serializeSvg } from '../lib/export'
import type { Instance, Mode } from '../types'

const props = defineProps<{ apiBaseUrl: string }>()
const api = new SolverApi(props.apiBaseUrl)
const mode = ref<Mode>('strip'), source = ref<'sample' | 'upload'>('sample'), sampleId = ref('puzzle')
const width = ref(100), sizeFactor = ref(1.5), timeLimit = ref(60)
const uploaded = ref<Instance | null>(null), uploadedText = ref(''), reading = ref(false)
const result = ref<RealResult | null>(null), job = ref<Job | null>(null), submitting = ref(false), cancelling = ref(false)
const fetchingResult = ref(false)
const ready = ref(false), checking = ref(false), error = ref(''), message = ref(''), pollPaused = ref(false)
const labels = ref(true), container = ref(0), help = ref<HTMLDialogElement>(), canvas = ref<InstanceType<typeof NestingCanvas>>()
let timer: ReturnType<typeof setTimeout> | undefined, readVersion = 0, taskVersion = 0, pollVersion = 0, alive = true
const active = computed(() => submitting.value || fetchingResult.value || (job.value && ['queued', 'running', 'stopping'].includes(job.value.status)))
const instance = computed(() => source.value === 'sample' ? parseInstance(sampleText(sampleId.value)) : uploaded.value)
const pieces = computed(() => instance.value?.pieces ?? [])
const totalArea = computed(() => pieces.value.reduce((sum, p) => sum + area(p.polygon), 0))
const utilization = computed(() => result.value ? totalArea.value / (result.value.width * result.value.height * result.value.containers) * 100 : 0)
const states: Record<Job['status'], string> = { queued: '排队中', running: '正在求解', stopping: '正在取消', completed: '已完成', failed: '求解失败', cancelled: '已取消', timed_out: '达到时间上限', interrupted: '服务中断' }
const stateLabel = computed(() => fetchingResult.value ? '正在加载结果' : submitting.value ? '正在提交' : job.value ? states[job.value.status] : '等待求解')

watch([mode, source, sampleId, width, sizeFactor, timeLimit], () => {
  if (active.value) return
  taskVersion++; pollVersion++;
  result.value = null; job.value = null; container.value = 0; error.value = ''; message.value = ''
  readVersion++; reading.value = false
})

async function checkConnection() {
  checking.value = true; error.value = ''
  try { await api.ready(); if (alive) ready.value = true }
  catch (err) { if (alive) { ready.value = false; error.value = (err as Error).message } }
  finally { if (alive) checking.value = false }
}

async function readFile(file?: File) {
  if (!file || active.value) return
  const version = ++readVersion
  uploaded.value = null; uploadedText.value = ''; result.value = null; job.value = null; error.value = ''; message.value = ''; reading.value = true
  try {
    if (!/\.txt$/i.test(file.name) || file.size > 1024 * 1024) throw new Error('请选择不超过 1 MiB 的 UTF-8 TXT 文件。')
    const text = await file.text()
    if (version !== readVersion || !alive) return
    uploaded.value = parseInstance(text); uploadedText.value = text
    message.value = '零件已在本地预览。点击“开始求解”后才会发送到服务器。'
  } catch (err) { if (version === readVersion && alive) error.value = (err as Error).message }
  finally { if (version === readVersion && alive) reading.value = false }
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  void readFile(input.files?.[0]); input.value = ''
}

async function start() {
  if (active.value || !instance.value || !ready.value) return
  const version = ++taskVersion
  pollVersion++
  submitting.value = true; result.value = null; job.value = null; error.value = ''; message.value = ''; container.value = 0; pollPaused.value = false
  try {
    const text = source.value === 'sample' ? sampleText(sampleId.value) : uploadedText.value
    const submitted = await api.submit(text, { mode: mode.value, ...(mode.value === 'strip' ? { width: width.value } : {}), sizeFactor: sizeFactor.value, timeLimitSeconds: timeLimit.value })
    if (!alive || version !== taskVersion) return
    job.value = submitted
    void poll()
  } catch (err) { if (alive) error.value = (err as Error).message }
  finally { if (alive) submitting.value = false }
}

async function poll() {
  clearTimeout(timer)
  if (!job.value || !alive) return
  const version = taskVersion, requestVersion = ++pollVersion, requestedId = job.value.id, expectedPieces = pieces.value.length
  const current = () => alive && version === taskVersion && requestVersion === pollVersion && job.value?.id === requestedId
  pollPaused.value = false; error.value = ''
  try {
    const updated = await api.status(requestedId)
    if (!current()) return
    fetchingResult.value = updated.hasResult && !['queued', 'running', 'stopping'].includes(updated.status)
    job.value = updated
    if (['queued', 'running', 'stopping'].includes(updated.status)) {
      timer = setTimeout(() => void poll(), 1000)
      return
    }
    if (updated.hasResult) {
      const computed = await api.result(requestedId, expectedPieces)
      if (!current()) return
      result.value = computed
      message.value = `${states[updated.status]}。已显示通过几何校验的可行排样；未证明全局最优。`
    } else message.value = `${states[updated.status]}，没有可显示的有效结果。`
    if (updated.error) error.value = updated.error
  } catch (err) {
    if (current()) {
      error.value = (err as Error).message
      if (err instanceof ApiError && [401, 404].includes(err.status)) {
        job.value = { ...job.value!, status: 'interrupted', hasResult: false }; pollPaused.value = false
        message.value = '此任务会话已失效，可以重新提交。'
      } else pollPaused.value = true
    }
  } finally { if (current()) fetchingResult.value = false }
}

async function cancel() {
  if (!job.value || cancelling.value) return
  const version = taskVersion, identity = job.value.id
  pollVersion++; clearTimeout(timer)
  cancelling.value = true; error.value = ''
  try {
    const updated = await api.cancel(identity)
    if (!alive || version !== taskVersion || job.value?.id !== identity) return
    job.value = updated; void poll()
  } catch (err) { if (alive && version === taskVersion) { error.value = (err as Error).message; pollPaused.value = true } }
  finally { if (alive) cancelling.value = false }
}

function saveTemplate() { download('nesting-example.txt', sampleText(sampleId.value), 'text/plain;charset=utf-8') }
function saveJson() { if (result.value) download(`nesting-result-${job.value?.id}.json`, JSON.stringify(result.value, null, 2), 'application/json;charset=utf-8') }
function saveSvg() { if (result.value) download(`nesting-result-container-${container.value + 1}.svg`, serializeSvg(result.value, container.value, labels.value, true), 'image/svg+xml;charset=utf-8') }
onMounted(() => void checkConnection())
onUnmounted(() => { alive = false; clearTimeout(timer); readVersion++ })
</script>

<template>
  <header class="site-header"><a class="brand" href="#main"><strong>Nesting</strong><span>二维排样演示</span></a><nav aria-label="主导航"><a class="active" href="#main">工作台</a><button @click="help?.showModal()">使用说明</button><a href="https://github.com/iliujin/nesting-demo" target="_blank" rel="noopener noreferrer">GitHub</a></nav></header>
  <main id="main">
    <section class="intro"><h1>让每一块材料，物尽其用。</h1><p>上传零件，运行求解，查看真实排样结果。</p></section>
    <div class="notice"><span>{{ ready ? '在线求解已连接 · 算法在私有服务器运行' : checking ? '正在连接求解服务…' : '求解服务暂不可用' }}</span><button v-if="!ready" class="text-button" :disabled="checking" @click="checkConnection">重新连接</button></div>
    <div class="workspace">
      <aside class="settings" aria-labelledby="settings-title"><h2 id="settings-title">求解设置</h2>
        <fieldset :disabled="!!active"><legend>排样模式</legend><div class="segmented"><button :aria-pressed="mode === 'strip'" @click="mode = 'strip'">无限长容器</button><button :aria-pressed="mode === 'bin'" @click="mode = 'bin'">固定容器</button></div></fieldset>
        <fieldset :disabled="!!active"><legend>实例来源</legend><div class="segmented"><button :aria-pressed="source === 'sample'" @click="source = 'sample'">内置示例</button><button :aria-pressed="source === 'upload'" @click="source = 'upload'">上传实例</button></div></fieldset>
        <template v-if="source === 'sample'"><label class="sr-only" for="sample">选择内置示例</label><select id="sample" v-model="sampleId" :disabled="!!active"><option v-for="sample in sampleOptions" :key="sample.id" :value="sample.id">{{ sample.label }}</option></select><div class="mini-heading">实例预览 <span>（{{ pieces.length }} 件）</span></div><div class="miniatures"><div v-for="piece in pieces.slice(0, 6)" :key="piece.id"><PiecePreview :piece="piece" /></div></div></template>
        <template v-else><label class="upload-zone" @dragover.prevent @drop.prevent="readFile($event.dataTransfer?.files[0])"><strong>{{ reading ? '正在读取…' : '选择或拖入 TXT 文件' }}</strong><span>最大 1 MiB · 点击求解后上传</span><input type="file" accept=".txt,text/plain" aria-label="上传 TXT 实例" :disabled="!!active" @change="onFile" /></label><button class="text-button template-link" @click="saveTemplate">下载 TXT 模板</button><p v-if="uploaded" class="file-summary">{{ uploaded.name }} · {{ uploaded.pieces.length }} 件</p></template>
        <div v-if="mode === 'strip'" class="field"><label for="width">容器宽度</label><input id="width" v-model.number="width" type="number" min="1" max="10000" step="1" :disabled="!!active" /></div>
        <div v-else class="field"><label for="factor">容器尺寸系数</label><select id="factor" v-model.number="sizeFactor" :disabled="!!active"><option :value="1.1">小型 · 1.1</option><option :value="1.5">中型 · 1.5</option><option :value="2">大型 · 2.0</option></select></div>
        <div class="field"><label for="time">运行时间上限</label><select id="time" v-model.number="timeLimit" :disabled="!!active"><option :value="30">30 秒</option><option :value="60">60 秒</option><option :value="120">120 秒</option></select></div>
        <p class="caption angle-note">旋转角度：0° / 90° / 180° / 270°</p><p class="caption settings-note">{{ mode === 'strip' ? '宽度须大于最大零件边长。' : '正方形边长由最大零件边长 × 尺寸系数确定。' }}</p>
        <button class="primary-button" :disabled="!!active || !ready || !pieces.length || reading" @click="start">{{ submitting ? '正在提交…' : active ? stateLabel : '开始求解' }}</button>
        <button v-if="job && ['queued', 'running', 'stopping'].includes(job.status)" class="outline-button cancel-button" :disabled="cancelling || job.status === 'stopping'" @click="cancel">{{ cancelling || job.status === 'stopping' ? '正在取消…' : '取消任务' }}</button>
        <p v-if="error" role="alert" class="error-message">{{ error }}</p><button v-if="pollPaused" class="text-button" @click="poll">重新查询任务</button>
      </aside>
      <section class="result-panel" aria-labelledby="result-title">
        <div class="result-header"><h2 id="result-title">{{ result ? '排样结果' : '零件预览' }}</h2><div v-if="result" class="toolbar"><label class="checkbox"><input v-model="labels" type="checkbox" />零件编号</label><button class="outline-button" @click="canvas?.fit()">适应画布</button><button class="outline-button" @click="saveSvg">下载 SVG</button></div></div>
        <div class="metrics" aria-label="实例指标"><div><span>零件数量</span><strong>{{ pieces.length }}</strong></div><div><span>{{ result ? '材料利用率' : '零件总面积' }}</span><strong>{{ result ? `${utilization.toFixed(1)}%` : numberText(totalArea) }}</strong></div><div><span>{{ result ? (mode === 'strip' ? '使用长度' : '容器数量') : '当前状态' }}</span><strong :class="{ 'text-metric': !result }">{{ result ? (mode === 'strip' ? numberText(result.width) : result.containers) : stateLabel }}</strong><small v-if="result">真实计算 · 已校验</small></div></div>
        <div v-if="result && mode === 'bin'" class="container-picker"><label for="container">查看容器</label><select id="container" v-model.number="container"><option v-for="i in result.containers" :key="i" :value="i - 1">容器 {{ i }} / {{ result.containers }}</option></select></div>
        <NestingCanvas v-if="result" ref="canvas" :layout="result" :real="true" :container="container" :labels="labels" />
        <div v-else class="parts-area"><div v-if="!pieces.length" class="empty-state"><h3>从一个实例开始</h3><p>上传 TXT 文件，预览轮廓后开始求解。</p><button class="outline-button" @click="saveTemplate">下载 TXT 模板</button></div><template v-else><div class="parts-caption"><strong>{{ instance?.name }}</strong><span>{{ active ? '任务进行中，完成后显示经过校验的排样。' : '这是输入零件预览，点击“开始求解”运行。' }}</span></div><div class="parts-grid"><figure v-for="piece in pieces" :key="piece.id"><PiecePreview :piece="piece" /><figcaption>零件 {{ piece.id }}<span>面积 {{ numberText(area(piece.polygon)) }}</span></figcaption></figure></div></template></div>
        <div class="result-footer"><span class="caption">坐标单位：实例单位</span><button v-if="result" class="text-button" @click="saveJson">下载结果 JSON</button></div><p class="status-message" role="status" aria-live="polite">{{ message || (job ? `${stateLabel} · 任务 ${job.id.slice(0, 8)}` : '') }}</p>
      </section>
    </div><footer class="site-footer">求解器运行于私有服务器。任务与上传数据约保留 24 小时。</footer>
  </main>
  <dialog ref="help" aria-labelledby="help-title"><div class="dialog-header"><h2 id="help-title">使用说明</h2><button class="icon-button" aria-label="关闭使用说明" @click="help?.close()">×</button></div><ol><li>选择排样模式、实例和参数，点击“开始求解”。内置示例也会实际运行。</li><li>上传支持坐标行 TXT 格式；整数坐标范围 ±10,000，最多 100 种、500 件零件、每件 500 顶点，展开后共 10,000 顶点。</li><li>任务依次排队。求解期间可取消；达到时间上限时，有有效结果则展示当前可行解。</li><li>结果检查数量、形状、容器边界与重叠。展示可行解，不代表已证明全局最优。</li><li>关闭网页不会立即取消任务，任务会按时间上限结束；当前页面关闭后不保留访客会话。</li></ol><button class="primary-button" @click="help?.close()">开始体验</button></dialog>
</template>

<style scoped>
.cancel-button { width: 100%; margin-top: 10px; }
.notice { justify-content: space-between; }
.field select { width: 100%; }
</style>
