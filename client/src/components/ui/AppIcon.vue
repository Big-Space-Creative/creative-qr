<script setup lang="ts">
import { computed } from 'vue'

// Ícones 16 px, traço 1,5 (Figma · Ícones). A cor vem do texto (currentColor).
const icons = import.meta.glob('@/assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const props = defineProps<{ name: string }>()
const svg = computed(() => icons[`/src/assets/icons/${props.name}.svg`] ?? '')
</script>

<template>
  <span class="inline-flex size-4 shrink-0 [&>svg]:size-full" aria-hidden="true" v-html="svg" />
</template>
