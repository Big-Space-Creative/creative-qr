<script setup lang="ts">
// Bloco título + texto (Figma: FeatureBlock e FaqItem). `heading` = título 18/24; senão Medium 14/22.
defineProps<{ title: string; text: string; heading?: boolean }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <h3 :class="heading ? 'text-heading' : 'text-body-medium'" class="text-fg">{{ title }}</h3>
    <p class="text-body text-fg-2">{{ text }}</p>
  </div>
</template>
