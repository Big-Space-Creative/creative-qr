<script setup lang="ts">
const model = defineModel<string>({ default: '#151412' })
defineProps<{ label: string }>()
</script>

<template>
  <label class="flex cursor-pointer items-center gap-3">
    <span
      class="relative size-10 shrink-0 overflow-hidden rounded-sm border border-fg-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
      :style="{ backgroundColor: model }"
    >
      <input v-model="model" type="color" class="absolute inset-0 size-full cursor-pointer opacity-0" />
    </span>
    <span class="text-small flex flex-col">
      <span class="text-fg-2">{{ label }}</span>
      <span class="text-data text-fg">{{ model.toUpperCase() }}</span>
    </span>
  </label>
</template>
