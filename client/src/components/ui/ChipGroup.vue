<script setup lang="ts" generic="T extends string">
import BaseTab from './BaseTab.vue'

defineProps<{ label: string; options: { value: T; label: string; disabled?: boolean }[] }>()
const model = defineModel<T>()
</script>

<template>
  <div class="flex flex-col gap-2" role="group" :aria-label="label">
    <p class="text-small text-fg-2">{{ label }}</p>
    <div class="flex flex-wrap gap-2">
      <BaseTab v-for="o in options" :key="o.value" :active="model === o.value" :disabled="o.disabled" @click="model = o.value">
        {{ o.label }}
      </BaseTab>
    </div>
  </div>
</template>
