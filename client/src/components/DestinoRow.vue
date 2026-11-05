<script setup lang="ts">
defineProps<{ label?: string; value: string }>()
</script>

<template>
  <div class="text-small flex flex-col gap-2">
    <span class="text-fg-2">{{ label ?? 'Destino' }}</span>
    <span class="text-data truncate text-fg">{{ value }}</span>
  </div>
</template>
