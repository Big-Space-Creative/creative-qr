<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { LOCALES, locale, setLocale, t, type Locale } from '@/i18n'
import AppIcon from './AppIcon.vue'
import SelectMenu from './SelectMenu.vue'
import SelectOption from './SelectOption.vue'

// Seletor de idioma do topo (Figma: componente Idioma). Desktop mostra o nome; mobile, a sigla.
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const current = computed(() => LOCALES.find((l) => l.id === locale.value) ?? LOCALES[0]!)

function pick(id: Locale) {
  setLocale(id)
  open.value = false
  trigger.value?.focus()
}
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
  <div ref="root" class="relative">
    <button
      ref="trigger"
      type="button"
      class="focus-ring text-body inline-flex h-12 items-center gap-2 rounded-sm border border-line-strong bg-surface px-3 text-fg hover:border-fg-3 md:h-10"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="`${t('nav.language')}: ${current.label}`"
      @click="open = !open"
    >
      <AppIcon name="globe" class="text-fg-2" />
      <span class="hidden md:inline">{{ current.label }}</span>
      <span class="md:hidden">{{ current.short }}</span>
      <AppIcon name="chevron" class="text-fg-2 transition-transform" :class="{ 'rotate-180': open }" />
    </button>
    <SelectMenu v-if="open" class="absolute top-full right-0 z-50 mt-1 w-60" :aria-label="t('nav.language')">
      <SelectOption v-for="l in LOCALES" :key="l.id" :selected="l.id === locale" @click="pick(l.id)">{{ l.label }}</SelectOption>
    </SelectMenu>
  </div>
</template>
