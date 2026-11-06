<script setup lang="ts">
import { onMounted, ref } from 'vue'

const el = ref<HTMLElement>()
const options = () => [...(el.value?.querySelectorAll<HTMLElement>('[role=option]:not([aria-disabled=true])') ?? [])]

// Ao abrir, o foco vai para a opção selecionada (ou a primeira).
onMounted(() => (el.value?.querySelector<HTMLElement>('[aria-selected=true]') ?? options()[0])?.focus())

function onKey(e: KeyboardEvent) {
  const list = options()
  const i = list.indexOf(document.activeElement as HTMLElement)
  const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key]
  if (next === undefined || !list.length) return
  e.preventDefault()
  list[(next + list.length) % list.length]?.focus()
}
</script>

<template>
  <div ref="el" role="listbox" class="flex flex-col rounded-md border border-line-strong bg-surface p-1" @keydown="onKey">
    <slot />
  </div>
</template>
