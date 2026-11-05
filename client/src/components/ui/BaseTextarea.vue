<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<string>({ default: '' })
defineProps<{ label: string; help?: string; error?: string; disabled?: boolean; placeholder?: string; rows?: number }>()

const id = useId()
</script>

<template>
  <div class="flex flex-col gap-2" :class="{ 'opacity-40': disabled }">
    <label :for="id" class="text-small text-fg-2">{{ label }}</label>
    <div class="field !h-auto min-h-24 items-start py-3" :data-invalid="!!error">
      <textarea
        :id="id"
        v-model="model"
        :rows="rows ?? 3"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-invalid="!!error"
        :aria-describedby="error || help ? `${id}-msg` : undefined"
        class="text-body placeholder:text-fg-3 w-full resize-y bg-transparent text-fg outline-none"
      />
    </div>
    <p v-if="error || help" :id="`${id}-msg`" class="text-small" :class="error ? 'text-danger' : 'text-fg-3'">
      {{ error || help }}
    </p>
  </div>
</template>
