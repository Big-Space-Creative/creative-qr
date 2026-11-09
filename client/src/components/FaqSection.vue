<script setup lang="ts">
import { t } from '@/i18n'
import TextBlock from './TextBlock.vue'

const col1 = [1, 2, 3, 4]
const col2 = [5, 6, 7, 8]
</script>

<template>
  <section
    id="faq"
    aria-labelledby="faq-title"
    class="border-t border-line px-4 pt-6 pb-12 md:px-10 xl:px-40"
  >
    <div class="flex flex-col gap-10">
      <h1 id="faq-title" class="text-heading md:text-heading-lg">{{ t('faq.title') }}</h1>
      <div class="grid gap-8 md:grid-cols-2">
        <div class="flex flex-col gap-8">
          <TextBlock v-for="n in col1" :key="n" :title="t(`faq.q${n}`)" :text="t(`faq.a${n}`)" />
        </div>
        <div class="flex flex-col gap-8">
          <TextBlock v-for="n in col2" :key="n" :title="t(`faq.q${n}`)" :text="t(`faq.a${n}`)" />
        </div>
      </div>
    </div>
  </section>
</template>
