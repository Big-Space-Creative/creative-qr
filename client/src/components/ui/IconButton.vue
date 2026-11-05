<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ icon: string; label: string }>()
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    class="focus-ring inline-flex size-12 items-center justify-center rounded-sm text-fg-2 hover:bg-sunken hover:text-fg disabled:pointer-events-none disabled:opacity-40 md:size-10"
  >
    <AppIcon :name="icon" />
  </button>
</template>
