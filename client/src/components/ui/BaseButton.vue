<script setup lang="ts">
import AppIcon from './AppIcon.vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

withDefaults(defineProps<{ variant?: Variant; icon?: string }>(), { variant: 'primary' })

const variants: Record<Variant, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed',
  secondary: 'border-line-strong bg-surface text-fg hover:bg-sunken active:border-fg active:bg-sunken',
  ghost: 'border-transparent text-fg-2 hover:bg-sunken hover:text-fg active:border-line active:bg-sunken active:text-fg',
  danger: 'border-danger bg-surface text-danger hover:bg-sunken active:bg-sunken',
}
</script>

<template>
  <button
    type="button"
    class="focus-ring text-body-medium inline-flex h-12 items-center justify-center gap-2 rounded-sm border px-4 whitespace-nowrap disabled:pointer-events-none disabled:opacity-40 md:h-10"
    :class="variants[variant]"
  >
    <AppIcon v-if="icon" :name="icon" />
    <slot />
  </button>
</template>
