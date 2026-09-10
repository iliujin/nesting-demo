<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import LiveWorkbench from './components/LiveWorkbench.vue'
import { loadConfig, type AppConfig } from './lib/api'
import NestingCanvas from './components/NestingCanvas.vue'
import PiecePreview from './components/PiecePreview.vue'
import { area, numberText } from './lib/geometry'
import { parseInstance } from './lib/instances'
import { sampleLayout, sampleOptions, sampleText } from './lib/samples'
import { download, serializeSvg } from './lib/export'
import type { Instance, Mode } from './types'

const appConfig = ref<AppConfig | null>(null), configError = ref('')
onMounted(async () => {
  try { appConfig.value = await loadConfig() }
  catch (err) { configError.value = (err as Error).message; appConfig.value = { mode: 'preview', apiBaseUrl: '' } }
})

const mode = ref<Mode>('strip'), source = ref<'sample' | 'upload'>('sample'), sampleId = ref('puzzle')
const labels = ref(true), container = ref(0), resultVisible = ref(true)
const uploaded = ref<Instance | null>(null), error = ref(''), message = ref(''), reading = ref(false)
const help = ref<HTMLDialogElement>(), canvas = ref<InstanceType<typeof NestingCanvas>>()
let readVersion = 0
const layout = computed(() => sampleLayout(sampleId.value, mode.value))
const pieces = computed(() => source.value === 'sample' ? layout.value.placements : uploaded.value?.pieces ?? [])
const totalArea = computed(() => pieces.value.reduce((sum, p) => sum + area(p.polygon), 0))
const utilization = computed(() => totalArea.value / (layout.value.width * layout.value.height * layout.value.containers) * 100)
const showingResult = computed(() => source.value === 'sample' && resultVisible.value)
const name = computed(() => source.value === 'sample' ? layout.value.name : uploaded.value?.name ?? '等待选择文件')

watch([mode, sampleId, source], () => {
  resultVisible.value = false; container.value = 0; message.value = ''; error.value = ''
  readVersion++; reading.value = false
})

function showExample() {
  resultVisible.value = true; container.value = 0; canvas.value?.fit()
  message.value = '已载入预计算示例，未执行在线求解。'
}
async function readFile(file?: File) {
  if (!file) return
  const version = ++readVersion
  uploaded.value = null; error.value = ''; message.value = ''; reading.value = true
  try {
    if (!/\.txt$/i.test(file.name)) throw new Error('请选择 UTF-8 编码的 .txt 实例文件。')
    if (file.size > 1024 * 1024) throw new Error('文件大小不能超过 1 MiB。')
    const text = await file.text()
    if (version !== readVersion) return
    uploaded.value = parseInstance(text)
    message.value = `已在本地解析 ${uploaded.value.pieces.length} 件零件，文件没有发送到服务器。`
  } catch (err) {
    if (version === readVersion) error.value = err instanceof Error ? err.message : '无法读取文件。'
  } finally { if (version === readVersion) reading.value = false }
}
function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  void readFile(input.files?.[0]); input.value = ''
}
function saveSvg() { download(`nesting-example-${mode.value}-container-${container.value + 1}.svg`, serializeSvg(layout.value, container.value, labels.value), 'image/svg+xml;charset=utf-8') }
function saveJson() {
  download('nesting-example.json', JSON.stringify({ kind: 'illustrative_precomputed', notice: '界面合成示例，不代表求解器性能。', units: 'instance', ...layout.value }, null, 2), 'application/json;charset=utf-8')
}
function saveTemplate() { download('nesting-example.txt', sampleText(sampleId.value), 'text/plain;charset=utf-8') }
</script>

<template>
  <p v-if="!appConfig" class="status-message" role="status">正在加载工作台…</p>
  <LiveWorkbench v-else-if="appConfig.mode === 'live'" :api-base-url="appConfig.apiBaseUrl" />
  <template v-else>
  <p v-if="configError" role="alert">{{ configError }} 当前仅提供示例预览。</p>
  <header class="site-header">
    <a class="brand" href="#main" aria-label="Nesting 工作台"><strong>Nesting</strong><span>二维排样演示</span></a>
    <nav aria-label="主导航">
      <a class="active" href="#main" aria-current="page">工作台</a>
      <button @click="help?.showModal()">使用说明</button>
      <a href="https://github.com/iliujin/nesting-demo" target="_blank" rel="noopener noreferrer">GitHub</a>
    </nav>
  </header>

  <main id="main">
    <section class="intro" aria-labelledby="title">
      <h1 id="title">让每一块材料，物尽其用。</h1>
      <p>选择实例，探索二维不规则零件的排样结果。</p>
    </section>
    <div class="notice"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></svg><span>示例预览：当前展示预计算结果，真实求解需连接后端服务。</span></div>

    <div class="workspace">
      <aside class="settings" aria-labelledby="settings-title">
        <h2 id="settings-title">求解设置</h2>
        <fieldset><legend>排样模式</legend><div class="segmented">
          <button :aria-pressed="mode === 'strip'" @click="mode = 'strip'">无限长容器</button>
          <button :aria-pressed="mode === 'bin'" @click="mode = 'bin'">固定容器</button>
        </div></fieldset>
        <fieldset><legend>实例来源</legend><div class="segmented">
          <button :aria-pressed="source === 'sample'" @click="source = 'sample'">内置示例</button>
          <button :aria-pressed="source === 'upload'" @click="source = 'upload'">上传实例</button>
        </div></fieldset>
        <template v-if="source === 'sample'">
          <label class="sr-only" for="sample">选择内置示例</label>
          <select id="sample" v-model="sampleId"><option v-for="sample in sampleOptions" :key="sample.id" :value="sample.id">{{ sample.label }}</option></select>
          <div class="mini-heading">实例预览 <span>（{{ pieces.length }} 件）</span></div>
          <div class="miniatures"><div v-for="piece in pieces.slice(0, 6)" :key="piece.id"><PiecePreview :piece="piece" /></div></div>
        </template>
        <template v-else>
          <label class="upload-zone" @dragover.prevent @drop.prevent="readFile($event.dataTransfer?.files[0])">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 22V6m-6 6 6-6 6 6M6 21v5h20v-5"/></svg>
            <strong>{{ reading ? '正在读取…' : '选择或拖入 TXT 文件' }}</strong>
            <span>最大 1 MiB · 仅在浏览器预览</span>
            <input type="file" accept=".txt,text/plain" aria-label="上传 TXT 实例" @change="onFile" />
          </label>
          <button class="text-button template-link" @click="saveTemplate">下载 TXT 模板</button>
          <p v-if="uploaded" class="file-summary">{{ uploaded.name }} · {{ uploaded.pieces.length }} 件</p>
        </template>
        <div class="field"><label for="width">{{ mode === 'strip' ? '容器宽度' : '容器尺寸' }}</label><input id="width" readonly :value="source === 'sample' ? (mode === 'strip' ? layout.height : `${layout.width} × ${layout.height}`) : (uploaded?.width ?? '待接入后端后设置')" /></div>
        <div class="field"><label for="time">运行时间</label><input id="time" readonly value="未运行（示例预览）" /></div>
        <p class="caption angle-note">旋转角度：0° / 90° / 180° / 270°</p>
        <p class="caption settings-note">示例使用固定尺寸。参数调整与真实求解将在后端接入后开放。</p>
        <button v-if="source === 'sample'" class="primary-button" @click="showExample">查看示例结果</button>
        <button v-else class="primary-button" disabled>真实求解尚未接入</button>
        <p v-if="error" role="alert" class="error-message">{{ error }}</p>
      </aside>

      <section class="result-panel" aria-labelledby="result-title">
        <div class="result-header"><h2 id="result-title">{{ showingResult ? '排样预览' : '零件预览' }}</h2>
          <div class="toolbar" v-if="showingResult">
            <label class="checkbox"><input v-model="labels" type="checkbox" />零件编号</label>
            <button class="outline-button" @click="canvas?.fit()">适应画布</button>
            <button class="outline-button" @click="saveSvg">下载 SVG</button>
          </div>
        </div>
        <div class="metrics" aria-label="实例指标">
          <div><span>零件数量</span><strong>{{ pieces.length }}</strong></div>
          <div><span>{{ showingResult ? '材料利用率' : '零件总面积' }}</span><strong>{{ showingResult ? `${utilization.toFixed(1)}%` : numberText(totalArea) }}</strong></div>
          <div><span>{{ showingResult ? (mode === 'strip' ? '使用长度' : '容器数量') : '当前状态' }}</span><strong :class="{ 'text-metric': !showingResult }">{{ showingResult ? (mode === 'strip' ? layout.width : layout.containers) : '未求解' }}</strong><small v-if="showingResult">预计算示例</small></div>
        </div>
        <div v-if="showingResult && mode === 'bin'" class="container-picker"><label for="container">查看容器</label><select id="container" v-model.number="container"><option v-for="i in layout.containers" :key="i" :value="i - 1">容器 {{ i }} / {{ layout.containers }}</option></select><span class="caption">利用率按所有容器总面积计算</span></div>
        <NestingCanvas v-if="showingResult" ref="canvas" :layout="layout" :container="container" :labels="labels" />
        <div v-else class="parts-area">
          <div v-if="!pieces.length" class="empty-state"><h3>从一个实例开始</h3><p>上传 TXT 文件，即可在这里查看零件轮廓。</p><button class="outline-button" @click="saveTemplate">下载 TXT 模板</button></div>
          <template v-else><div class="parts-caption"><strong>{{ name }}</strong><span>{{ source === 'sample' ? '点击“查看示例结果”载入预计算排样。' : '仅展示输入零件，尚未求解；各缩略图独立缩放。' }}</span></div><div class="parts-grid"><figure v-for="piece in pieces" :key="piece.id"><PiecePreview :piece="piece" /><figcaption>零件 {{ piece.id }}<span>面积 {{ numberText(area(piece.polygon)) }}</span></figcaption></figure></div></template>
        </div>
        <div class="result-footer"><span class="caption">坐标单位：实例单位</span><button v-if="showingResult" class="text-button" @click="saveJson">下载结果 JSON</button></div>
        <p class="status-message" role="status" aria-live="polite">{{ message }}</p>
      </section>
    </div>
    <footer class="site-footer">真实求解接入后，算法在私有服务器运行，页面只接收排样结果。</footer>
  </main>

  <dialog ref="help" aria-labelledby="help-title" @click="($event.target === help) && help?.close()">
    <div class="dialog-header"><h2 id="help-title">使用说明</h2><button class="icon-button" aria-label="关闭使用说明" @click="help?.close()"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div>
    <ol><li><strong>选择模式与实例。</strong>无限长容器显示使用长度；固定容器显示容器数量。</li><li><strong>查看示例结果。</strong>示例由人工合成，利用率按坐标面积计算，不是算法性能测试。</li><li><strong>探索排样图。</strong>点击零件查看面积，使用缩放、编号、容器切换，下载 SVG 或 JSON。</li><li><strong>上传自己的零件。</strong>支持坐标行 TXT 格式，可下载模板；本版本只在浏览器解析，不上传文件、不运行求解器。</li></ol>
    <p>预览上限：1 MiB、500 件零件、每件 500 个顶点、展开后 10,000 个顶点。支持可选数量与容器宽度；PIECE 分块、孔洞等格式暂不支持。</p>
    <p>真实求解尚未接入。后端需要独立的 HTTPS 服务，并在服务端校验输入、实施访问控制和资源限额。</p>
    <button class="primary-button" @click="help?.close()">开始体验</button>
  </dialog>
  </template>
</template>
