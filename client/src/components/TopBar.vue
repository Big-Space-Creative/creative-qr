<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { t } from '@/i18n'
import { preferencesOpen } from '@/lib/consent'
import BrandSymbol from './brand/BrandSymbol.vue'
import BrandWordmark from './brand/BrandWordmark.vue'
import IconButton from './ui/IconButton.vue'
import LanguageSwitch from './ui/LanguageSwitch.vue'

// Header (Figma: Topbar). Desktop: links + idioma. Mobile: idioma + botão de menu com painel.
const menuOpen = ref(false)
const link = 'focus-ring text-body rounded-sm text-fg-2 hover:text-fg'

function openCookies() {
  menuOpen.value = false
  preferencesOpen.value = true
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false
}
watch(menuOpen, (on) => {
  if (on) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <header class="relative z-30 flex h-16 items-center gap-2.5 px-4 md:px-10 xl:px-40">
    <BrandSymbol :size="32" />
    <BrandWordmark :width="128.573" />
    <span class="flex-1" />
    <nav class="hidden items-center gap-6 pr-3.5 md:flex" :aria-label="t('nav.label')">
      <a href="#sobre" :class="link">{{ t('nav.about') }}</a>
      <a href="#faq" :class="link">{{ t('nav.faq') }}</a>
      <button type="button" :class="link" @click="openCookies">{{ t('nav.cookies') }}</button>
    </nav>
    <LanguageSwitch />
    <IconButton
      class="md:hidden"
      :icon="menuOpen ? 'x' : 'menu'"
      :label="menuOpen ? t('nav.closeMenu') : t('nav.menu')"
      :aria-expanded="menuOpen"
      @click="menuOpen = !menuOpen"
    />

    <template v-if="menuOpen">
      <div class="fixed inset-x-0 top-16 bottom-0 z-0 bg-scrim md:hidden" aria-hidden="true" @click="menuOpen = false" />
      <nav class="absolute inset-x-0 top-full z-10 border-y border-line bg-surface md:hidden" :aria-label="t('nav.label')">
        <a href="#sobre" class="focus-ring text-body flex h-14 items-center border-b border-line px-4" @click="menuOpen = false">{{ t('nav.about') }}</a>
        <a href="#faq" class="focus-ring text-body flex h-14 items-center border-b border-line px-4" @click="menuOpen = false">{{ t('nav.faq') }}</a>
        <button type="button" class="focus-ring text-body flex h-14 w-full items-center px-4 text-left" @click="openCookies">{{ t('nav.cookies') }}</button>
      </nav>
    </template>
  </header>
</template>
