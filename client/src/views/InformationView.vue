<script setup lang="ts">
import AboutSection from '@/components/AboutSection.vue'
import FaqSection from '@/components/FaqSection.vue'
import { t } from '@/i18n'
defineProps<{ page: 'about' | 'faq' }>()
</script>

<template>
  <main id="information-page" tabindex="-1" class="min-h-[calc(100dvh-180px)] outline-none">
    <div class="px-4 pt-4 md:px-10 xl:px-40">
      <a
        href="#/"
        class="focus-ring text-body inline-flex min-h-12 items-center rounded-sm text-link"
        >← {{ t('nav.back') }}</a
      >
    </div>
    <AboutSection v-if="page === 'about'" />
    <FaqSection v-else />
  </main>
</template>
