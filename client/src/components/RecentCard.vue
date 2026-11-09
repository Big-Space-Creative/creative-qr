<script setup lang="ts">
defineProps<{ name: string; meta: string; wrap?: boolean }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- O QR é sempre preto sobre branco, nunca invertido. -->
    <div
      class="flex justify-center rounded-[2px] bg-qr-paper p-2 [&>*]:aspect-square [&>*]:w-full [&>*]:max-w-24 [&>*]:object-contain"
    >
      <slot />
    </div>
    <p class="text-body-medium text-fg" :class="wrap ? 'break-words' : 'truncate'">{{ name }}</p>
    <p class="text-small text-fg-3" :class="wrap ? 'break-words' : 'truncate'">{{ meta }}</p>
  </div>
</template>
