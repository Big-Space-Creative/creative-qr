<script setup lang="ts">
import BaseToggle from './BaseToggle.vue'

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="flex cursor-pointer items-center gap-3">
    <BaseToggle v-model="model" />
    <span class="text-body"><slot /></span>
  </label>
</template>
