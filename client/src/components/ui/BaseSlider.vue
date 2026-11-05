<script setup lang="ts">
import { computed, useId } from 'vue'

const model = defineModel<number>({ default: 0 })
const props = defineProps<{ label: string; min: number; max: number; step?: number; valueText?: string }>()

const id = useId()
const fill = computed(() => `${((model.value - props.min) / (props.max - props.min)) * 100}%`)
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-start gap-2">
      <label :for="id" class="text-small text-fg-2">{{ label }}</label>
      <span class="flex-1" />
      <span class="text-data text-fg">{{ valueText ?? model }}</span>
    </div>
    <input :id="id" v-model.number="model" type="range" class="slider" :min="min" :max="max" :step="step ?? 1" :style="{ '--fill': fill }" />
  </div>
</template>
