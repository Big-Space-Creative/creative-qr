<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const model = defineModel<boolean>({ default: false })
defineProps<{ indeterminate?: boolean; disabled?: boolean }>()
</script>

<template>
  <label class="text-body flex h-12 cursor-pointer items-center gap-3 md:h-10" :class="{ 'pointer-events-none opacity-40': disabled }">
    <input
      v-model="model"
      type="checkbox"
      class="peer sr-only"
      :disabled="disabled"
      :indeterminate="indeterminate"
    />
    <span
      class="peer-focus-visible:outline-focus flex size-5 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface text-fg peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 hover:border-fg-3"
      :class="{ '!border-fg !bg-sunken': model || indeterminate }"
    >
      <span v-if="indeterminate" class="h-0.5 w-2 rounded-[1px] bg-fg" />
      <AppIcon v-else-if="model" name="check" />
    </span>
    <slot />
  </label>
</template>
