<script setup lang="ts">
import { useId } from 'vue'
import AppIcon from './ui/AppIcon.vue'

const open = defineModel<boolean>('open', { default: false })
defineProps<{ title: string; value?: string }>()

const id = useId()
</script>

<template>
  <div class="border-b border-line">
    <button
      type="button"
      class="focus-ring flex h-12 w-full items-center gap-3 text-left"
      :aria-expanded="open"
      :aria-controls="id"
      @click="open = !open"
    >
      <span class="text-body-medium text-fg">{{ title }}</span>
      <span v-if="value" class="text-small min-w-0 truncate text-fg-3">{{ value }}</span>
      <span class="flex-1" />
      <AppIcon name="chevron" class="text-fg-2 transition-transform" :class="{ 'rotate-180': open }" />
    </button>
    <div v-if="open" :id="id" class="pb-4"><slot /></div>
  </div>
</template>
