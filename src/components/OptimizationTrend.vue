<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProgressPoint } from '../lib/progress'

const props = defineProps<{ points: ProgressPoint[]; elapsed: number; running: boolean; mode: string; illustrative?: boolean }>()
const selected = ref<number | null>(null)
const first = computed(() => props.points[0]!)
const last = computed(() => props.points.at(-1)!)
const gain = computed(() => last.value.utilization - first.value.utilization)
const duration = computed(() => Math.max(1, props.elapsed, last.value.seconds))
const x = (seconds: number) => 48 + seconds / duration.value * 568
const y = (utilization: number) => 142 - utilization / 100 * 118
const line = computed(() => props.points.map((p, i) => `${i ? 'H' : 'M'} ${x(p.seconds)} ${i ? 'V' : ''} ${y(p.utilization)}`).join(' ') + ` H ${x(duration.value)}`)
const detail = computed(() => props.points[selected.value ?? props.points.length - 1] ?? last.value)
const percent = (value: number) => `${value.toFixed(1)}%`
</script>

<template>
  <section class="trend" aria-labelledby="trend-title">
    <div class="trend-header"><div><h3 id="trend-title">{{ illustrative ? '利用率提升演示' : '利用率提升趋势' }}</h3><p>{{ illustrative ? '人工合成步骤 · 时间为示意，不代表求解性能' : '从首个有效排样开始，记录实际提升' }}</p></div><span class="trend-state" :class="{ live: running }">{{ illustrative ? (running ? '演示播放中' : '合成示例') : (running ? '持续更新中' : '本次优化记录') }}</span></div>
    <div class="trend-stats">
      <div><span>首次利用率</span><strong>{{ percent(first.utilization) }}</strong></div>
      <div><span>当前利用率</span><strong>{{ percent(last.utilization) }}</strong></div>
      <div class="gain"><span>累计提升</span><strong>{{ gain > 0 ? '+' : '' }}{{ gain.toFixed(1) }} <small>个百分点</small></strong></div>
    </div>
    <svg class="trend-chart" viewBox="0 0 640 174" role="img" :aria-label="`利用率趋势：从 ${percent(first.utilization)} 到 ${percent(last.utilization)}，提升 ${gain.toFixed(1)} 个百分点`">
      <g v-for="tick in [0, 25, 50, 75, 100]" :key="tick"><line x1="48" x2="616" :y1="y(tick)" :y2="y(tick)" class="grid" /><text x="39" :y="y(tick) + 4" text-anchor="end">{{ tick }}%</text></g>
      <path :d="`${line} V 142 H ${x(first.seconds)} Z`" class="fill" />
      <path :d="line" class="curve" />
      <g v-for="(point, i) in points" :key="i">
        <circle :cx="x(point.seconds)" :cy="y(point.utilization)" :r="selected === i ? 5 : 3.5" class="dot" />
        <circle :cx="x(point.seconds)" :cy="y(point.utilization)" r="12" class="hit" tabindex="0" :aria-label="`${point.seconds.toFixed(1)} 秒：${percent(point.utilization)}`" @mouseenter="selected = i" @focus="selected = i" @mouseleave="selected = null" @blur="selected = null"><title>{{ point.seconds.toFixed(1) }} 秒 · {{ percent(point.utilization) }}</title></circle>
      </g>
      <text x="48" y="165">0 秒</text><text x="332" y="165" text-anchor="middle">{{ (duration / 2).toFixed(1) }} 秒</text><text x="616" y="165" text-anchor="end">{{ duration.toFixed(1) }} 秒</text>
    </svg>
    <div class="trend-caption"><span>{{ detail.seconds.toFixed(1) }} 秒 · {{ percent(detail.utilization) }}</span><span>耗时 / 秒 · 利用率 / %</span></div>
    <p v-if="illustrative" class="trend-note">这些步骤展示排样与利用率的关系，未执行在线求解；时间轴为演示刻度。</p>
    <p v-else class="trend-note">{{ mode === 'bin' ? '容器数量减少时，总利用率才会提升；同样容器数量下的排样改善会显示为水平线。' : '找到更短的排样时，利用率随之提升；水平线表示该时段利用率未变化。' }}图表记录本页收到的结果，采样间的更新可能合并。</p>
    <details><summary>查看采样记录（{{ points.length }}）</summary><table><thead><tr><th>{{ illustrative ? '演示时间刻度' : '收到结果时的耗时' }}</th><th>利用率</th><th>较首次提升</th></tr></thead><tbody><tr v-for="(point, i) in points" :key="i"><td>{{ point.seconds.toFixed(1) }} 秒</td><td>{{ percent(point.utilization) }}</td><td>{{ (point.utilization - first.utilization).toFixed(1) }} 个百分点</td></tr></tbody></table></details>
  </section>
</template>

<style scoped>
.trend { margin: 16px 0; padding: 18px 20px 12px; border: 1px solid #dce7f4; border-radius: 10px; background: #fbfdff; }
.trend-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
h3 { margin: 0; color: #15345b; font-size: 16px; } p { margin: 5px 0 0; font-size: 12px; color: #647b96; }
.trend-state { flex-shrink: 0; border-radius: 20px; padding: 5px 9px; background: #eef2f7; color: #64748b; font-size: 11px; }
.trend-state.live { color: #06765c; background: #e4f5ee; }
.trend-stats { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 12px; margin: 18px 0 4px; }
.trend-stats span { display: block; color: #647b96; font-size: 12px; margin-bottom: 4px; }
.trend-stats strong { font-size: 22px; font-variant-numeric: tabular-nums; color: #15345b; }.trend-stats .gain strong { color: #078061; } small { font-size: 11px; font-weight: 500; }
.trend-chart { width: 100%; display: block; overflow: visible; } .trend-chart text { fill: #647b96; font-size: 11px; }
.grid { stroke: #e4ebf4; stroke-dasharray: 3 4; }.curve { fill: none; stroke: #1685ce; stroke-width: 2.5; stroke-linejoin: round; vector-effect: non-scaling-stroke; }.fill { fill: #1685ce; opacity: .065; }.dot { fill: #1685ce; stroke: white; stroke-width: 1.5; }.hit { fill: transparent; cursor: crosshair; }.hit:focus { outline: none; stroke: #15345b; stroke-width: 1; }
.trend-caption { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: #647b96; }.trend-caption span:first-child { color: #1871ac; font-variant-numeric: tabular-nums; }
.trend-note { font-size: 11px; line-height: 1.7; margin-top: 9px; } details { margin-top: 8px; color: #647b96; font-size: 11px; } summary { cursor: pointer; } table { width: 100%; border-collapse: collapse; margin-top: 8px; } th, td { padding: 6px; text-align: left; border-bottom: 1px solid #e4ebf4; }
@media (max-width: 600px) { .trend { padding: 14px 12px 10px; }.trend-header p { max-width: 180px; }.trend-stats { gap: 6px; }.trend-stats strong { font-size: 18px; } small { display: block; }.trend-chart text { font-size: 20px; }.trend-chart { margin-top: 10px; } }
</style>
