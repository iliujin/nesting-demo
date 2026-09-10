<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Layout, Placement } from '../types'
import { area, centroid, colors, numberText, pointsText } from '../lib/geometry'
const props = defineProps<{ layout: Layout; container: number; labels: boolean }>()
const zoom = ref(1), selected = ref<number | null>(null), viewport = ref<HTMLElement>()
const pieces = computed(() => props.layout.placements.filter(p => p.container === props.container))
const selectedPiece = computed(() => pieces.value.find(p => p.id === selected.value))
const margin = computed(() => Math.max(props.layout.width, props.layout.height) * 0.09)
const viewBox = computed(() => `${-margin.value} ${-margin.value} ${props.layout.width + margin.value * 2} ${props.layout.height + margin.value * 2}`)
const center = (piece: Placement) => { const point = centroid(piece.polygon); return { x: point[0], y: props.layout.height - point[1] } }
function fit() { zoom.value = 1; selected.value = null; viewport.value?.scrollTo({ top: 0, left: 0 }) }
watch(() => [props.layout, props.container], fit)
defineExpose({ fit })
</script>
<template>
  <div ref="viewport" class="canvas-viewport" aria-label="排样画布">
    <div class="canvas-stage" :style="{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }">
      <svg :viewBox="viewBox" class="layout-svg" role="group" :aria-label="`预计算示例：容器 ${container + 1}`">
        <g stroke="#8291a9" stroke-width="0.25" fill="none">
          <path :d="`M0,-4 V-7 M0,-5.5 H${layout.width} M${layout.width},-4 V-7`" />
          <path :d="`M-4,0 H-7 M-5.5,0 V${layout.height} M-4,${layout.height} H-7`" />
        </g>
        <text :x="layout.width / 2" y="-7.5" text-anchor="middle" font-size="3" fill="#586987">{{ numberText(layout.width) }}</text>
        <text :transform="`translate(-8 ${layout.height / 2}) rotate(-90)`" text-anchor="middle" font-size="3" fill="#586987">{{ numberText(layout.height) }}</text>
        <rect :width="layout.width" :height="layout.height" fill="white" stroke="#697b97" stroke-width="0.3" />
        <g :transform="`translate(0 ${layout.height}) scale(1 -1)`">
          <polygon v-for="piece in pieces" :key="piece.id" :points="pointsText(piece.polygon)"
            :fill="colors[(piece.id - 1) % colors.length]" :class="{ selected: selected === piece.id }"
            stroke="#425577" stroke-width="0.32" tabindex="0" role="button" :aria-label="`选择零件 ${piece.id}`" :aria-pressed="selected === piece.id"
            @click="selected = piece.id" @keydown.enter="selected = piece.id" @keydown.space.prevent="selected = piece.id" />
        </g>
        <g v-if="labels" class="piece-labels" font-size="3.2" fill="#172b48" text-anchor="middle" dominant-baseline="middle" pointer-events="none">
          <text v-for="piece in pieces" :key="piece.id" :x="center(piece).x" :y="center(piece).y">{{ piece.id }}</text>
        </g>
      </svg>
    </div>
  </div>
  <div class="canvas-bottom">
    <p class="caption" aria-live="polite">{{ selectedPiece ? `零件 ${selectedPiece.id} · 面积 ${numberText(area(selectedPiece.polygon))} · 旋转 ${selectedPiece.rotation}°` : '示例坐标仅用于功能展示，不代表求解器性能。' }}</p>
    <div class="zoom-controls" role="group" aria-label="画布缩放">
      <button class="icon-button" aria-label="缩小画布" :disabled="zoom <= 1" @click="zoom = Math.max(1, zoom - 0.25)"><svg viewBox="0 0 20 20"><path d="M5 10h10" /></svg></button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button class="icon-button" aria-label="放大画布" :disabled="zoom >= 3" @click="zoom = Math.min(3, zoom + 0.25)"><svg viewBox="0 0 20 20"><path d="M5 10h10M10 5v10" /></svg></button>
    </div>
  </div>
</template>
