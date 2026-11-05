<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ active?: boolean; icon?: string }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="!!active"
    class="focus-ring text-body inline-flex h-12 items-center gap-2 rounded-sm border px-4 whitespace-nowrap disabled:pointer-events-none disabled:opacity-40 md:h-10"
    :class="active ? 'border-fg bg-sunken text-fg' : 'border-transparent text-fg-2 hover:text-fg'"
  >
    <AppIcon v-if="icon" :name="icon" />
    <slot />
  </button>
</template>
