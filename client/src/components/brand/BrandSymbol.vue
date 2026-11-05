<script setup lang="ts">
import symbol from '@/assets/brand/symbol.svg?raw'

defineProps<{ size?: number }>()
const svg = symbol.replace(/ id="[^"]*"/g, '')
</script>

<template>
  <span
    class="inline-flex shrink-0 [&>svg]:size-full"
    :style="{ width: `${size ?? 32}px`, height: `${size ?? 32}px` }"
    role="img"
    aria-label="Creative QR"
    v-html="svg"
  />
</template>
