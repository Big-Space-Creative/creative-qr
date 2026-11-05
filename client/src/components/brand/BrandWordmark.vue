<script setup lang="ts">
import wordmark from '@/assets/brand/wordmark.svg?raw'

// Largura em px; a caixa mantém a proporção 321,4 × 40 do Figma (altura de maiúscula).
const props = defineProps<{ width?: number }>()
const w = props.width ?? 128.573
const svg = wordmark.replace(/ id="[^"]*"/g, '')
</script>

<template>
  <span
    class="relative inline-block shrink-0"
    :style="{ width: `${w}px`, height: `${(w * 40) / 321.433}px` }"
    aria-hidden="true"
  >
    <span class="absolute inset-x-0 top-[-1.49%] block [&>svg]:block [&>svg]:w-full" v-html="svg" />
  </span>
</template>
