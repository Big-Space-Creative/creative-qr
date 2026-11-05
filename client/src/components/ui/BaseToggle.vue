<script setup lang="ts">
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    class="focus-ring relative h-5 w-9 shrink-0 rounded-full border disabled:pointer-events-none disabled:opacity-40"
    :class="model ? 'border-fg bg-fg' : 'border-line-strong bg-sunken'"
    @click="model = !model"
  >
    <span
      class="absolute top-[2.5px] size-3.5 rounded-full transition-[left]"
      :class="model ? 'left-[20.5px] bg-app' : 'left-[2.5px] bg-fg-3'"
    />
  </button>
</template>
