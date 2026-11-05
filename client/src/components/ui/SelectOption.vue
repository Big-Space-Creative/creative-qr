<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ selected?: boolean; disabled?: boolean }>()
</script>

<template>
  <div
    role="option"
    :aria-selected="!!selected"
    :aria-disabled="disabled"
    class="text-body flex h-12 items-center gap-2 rounded-sm px-4 text-fg md:h-10"
    :class="[
      selected ? 'text-body-medium bg-sunken' : 'hover:bg-sunken',
      disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer',
    ]"
  >
    <span class="min-w-0 flex-1"><slot /></span>
    <AppIcon v-if="selected" name="check" />
  </div>
</template>
