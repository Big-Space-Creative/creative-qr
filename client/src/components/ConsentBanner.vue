<script setup lang="ts">
import { t } from '@/i18n'
import { decided, preferencesOpen, setConsent } from '@/lib/consent'
import BaseButton from './ui/BaseButton.vue'
</script>

<template>
  <!-- Aviso de armazenamento (Figma: telas 18 e 22). Não bloqueia a página. -->
  <section
    v-if="!decided"
    role="region"
    :aria-label="t('consent.bannerTitle')"
    class="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-4 border-t border-line bg-surface px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-10 md:py-6 xl:px-40"
  >
    <div class="flex flex-col gap-1 md:max-w-[700px]">
      <p class="text-body-medium text-fg">{{ t('consent.bannerTitle') }}</p>
      <p class="text-small text-fg-2">{{ t('consent.bannerText') }}</p>
    </div>
    <div class="flex flex-col gap-2 md:flex-row md:items-center">
      <BaseButton class="md:order-3" @click="setConsent(true)">{{ t('consent.acceptAll') }}</BaseButton>
      <BaseButton variant="secondary" class="md:order-2" @click="setConsent(false)">{{ t('consent.necessaryOnly') }}</BaseButton>
      <BaseButton variant="ghost" class="md:order-1" @click="preferencesOpen = true">{{ t('consent.personalize') }}</BaseButton>
    </div>
  </section>
</template>
