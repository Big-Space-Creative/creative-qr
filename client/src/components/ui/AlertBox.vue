<script setup lang="ts">
import AppIcon from './AppIcon.vue'

type Kind = 'info' | 'success' | 'danger'

const props = withDefaults(defineProps<{ kind?: Kind; title: string; dismissible?: boolean }>(), { kind: 'info' })
defineEmits<{ dismiss: [] }>()

// A cor nunca é o único sinal: o ícone também muda.
const kinds: Record<Kind, { icon: string; border: string; tone: string }> = {
  info: { icon: 'info', border: 'border-line-strong', tone: 'text-fg-accent' },
  success: { icon: 'check', border: 'border-success', tone: 'text-success' },
  danger: { icon: 'alert', border: 'border-danger', tone: 'text-danger' },
}
</script>

<template>
  <div
    :role="props.kind === 'danger' ? 'alert' : 'status'"
    class="flex items-start gap-3 rounded-md border bg-surface p-4"
    :class="kinds[kind].border"
  >
    <AppIcon :name="kinds[kind].icon" :class="kinds[kind].tone" class="mt-[3px]" />
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="text-body-medium text-fg">{{ title }}</p>
      <p v-if="$slots.default" class="text-small text-fg-2"><slot /></p>
    </div>
    <button
      v-if="dismissible"
      type="button"
      aria-label="Fechar aviso"
      class="focus-ring flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-2 hover:text-fg"
      @click="$emit('dismiss')"
    >
      <AppIcon name="x" />
    </button>
  </div>
</template>
