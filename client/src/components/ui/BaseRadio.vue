<script setup lang="ts">
const model = defineModel<string>()
defineProps<{ value: string; name?: string; disabled?: boolean }>()
</script>

<template>
  <label class="text-body flex h-12 cursor-pointer items-center gap-3 md:h-10" :class="{ 'pointer-events-none opacity-40': disabled }">
    <input v-model="model" type="radio" class="peer sr-only" :value="value" :name="name" :disabled="disabled" />
    <span
      class="peer-focus-visible:outline-focus flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 hover:border-fg-3"
      :class="{ '!border-fg !bg-sunken': model === value }"
    >
      <span v-if="model === value" class="size-2.5 rounded-full bg-fg" />
    </span>
    <slot />
  </label>
</template>
