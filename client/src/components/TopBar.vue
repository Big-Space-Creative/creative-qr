<script setup lang="ts">
import BrandSymbol from './brand/BrandSymbol.vue'
import BrandWordmark from './brand/BrandWordmark.vue'
</script>

<template>
  <header class="flex h-16 items-center gap-2.5 px-4 md:px-40">
    <BrandSymbol :size="32" />
    <BrandWordmark :width="128.573" />
  </header>
</template>
