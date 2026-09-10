<script setup lang="ts">
import { computed } from 'vue'
import type { Piece } from '../types'
import { bounds, colors } from '../lib/geometry'
const props = defineProps<{ piece: Piece }>()
const viewBox = computed(() => {
  const b = bounds(props.piece.polygon), pad = Math.max(b.width, b.height) * 0.13
  return `${b.minX - pad} ${-b.minY - b.height - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
})
</script>
<template>
  <svg :viewBox="viewBox" role="img" :aria-label="`零件 ${piece.id} 轮廓`">
    <polygon :points="piece.polygon.map(([x, y]) => `${x},${-y}`).join(' ')" :fill="colors[(piece.id - 1) % colors.length]" stroke="#425577" stroke-width="1.2" vector-effect="non-scaling-stroke" />
  </svg>
</template>
