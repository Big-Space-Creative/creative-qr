<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from 'vue'
import { t } from '@/i18n'
import AppIcon from './AppIcon.vue'
import SelectMenu from './SelectMenu.vue'
import SelectOption from './SelectOption.vue'

export interface SelectItem {
  value: string
  label: string
  disabled?: boolean
}

const model = defineModel<string>()
const props = defineProps<{
  label: string
  options: SelectItem[]
  placeholder?: string
  help?: string
  error?: string
  disabled?: boolean
}>()

const id = useId()
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()

const selectedLabel = () => props.options.find((o) => o.value === model.value)?.label

function pick(o: SelectItem) {
  if (o.disabled) return
  model.value = o.value
  open.value = false
  trigger.value?.focus()
}

// Fecha ao clicar fora ou com Esc. Ouve o documento: no Safari o botão não ganha foco ao clicar.
function onOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    trigger.value?.focus()
  }
}
document.addEventListener('mousedown', onOutside)
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutside)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="flex flex-col gap-2" :class="{ 'opacity-40': disabled }">
    <span :id="`${id}-label`" class="text-small text-fg-2">{{ label }}</span>
    <div class="relative">
      <button
        ref="trigger"
        type="button"
        class="field text-body text-left"
        :data-invalid="!!error"
        :disabled="disabled"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-labelledby="`${id}-label`"
        @click="open = !open"
      >
        <span class="min-w-0 flex-1 truncate" :class="selectedLabel() ? 'text-fg' : 'text-fg-3'">
          {{ selectedLabel() ?? placeholder ?? t('common.select') }}
        </span>
        <AppIcon name="chevron" class="text-fg-2 transition-transform" :class="{ 'rotate-180': open }" />
      </button>
      <SelectMenu v-if="open" class="absolute top-full left-0 z-10 mt-1 w-full">
        <SelectOption
          v-for="o in options"
          :key="o.value"
          :selected="o.value === model"
          :disabled="o.disabled"
          @click="pick(o)"
        >
          {{ o.label }}
        </SelectOption>
      </SelectMenu>
    </div>
    <p v-if="error || help" class="text-small" :class="error ? 'text-danger' : 'text-fg-3'">{{ error || help }}</p>
  </div>
</template>
