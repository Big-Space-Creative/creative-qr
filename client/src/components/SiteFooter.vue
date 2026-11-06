<script setup lang="ts">
import { t } from '@/i18n'
import BrandSymbol from './brand/BrandSymbol.vue'
import BrandWordmark from './brand/BrandWordmark.vue'
</script>

<template>
  <footer class="px-4 pb-8 md:px-10 xl:px-40 md:pb-12">
    <div class="flex flex-col gap-3 border-t border-line pt-6 md:flex-row md:items-center">
      <div class="flex items-center gap-2">
        <BrandSymbol :size="24" />
        <BrandWordmark :width="96.43" />
      </div>
      <span class="hidden flex-1 md:block" />
      <p class="text-small text-fg-3">{{ t('footer.credit') }}</p>
    </div>
  </footer>
</template>
