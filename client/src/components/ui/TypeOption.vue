<script setup lang="ts">
import BaseTab from './BaseTab.vue'

defineProps<{ icon: string; active?: boolean }>()
</script>

<template>
  <BaseTab :icon="icon" :active="active"><slot /></BaseTab>
</template>
