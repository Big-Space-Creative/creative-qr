<script setup lang="ts">
defineProps<{ name: string; meta: string }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- O QR é sempre preto sobre branco, nunca invertido. -->
    <div class="flex justify-center rounded-[2px] bg-qr-paper p-2 [&>*]:aspect-square [&>*]:w-full [&>*]:max-w-24 [&>*]:object-contain">
      <slot />
    </div>
    <p class="text-body-medium truncate text-fg">{{ name }}</p>
    <p class="text-small truncate text-fg-3">{{ meta }}</p>
  </div>
</template>
