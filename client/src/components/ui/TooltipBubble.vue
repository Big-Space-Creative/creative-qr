<script setup lang="ts">
type Side = 'top' | 'bottom' | 'left' | 'right'

// Fundo invertido para contraste ≥ 4,5:1. Não coloque ação dentro.
// `side` indica onde o balão fica em relação ao elemento; a seta aponta para ele.
const props = withDefaults(defineProps<{ side?: Side }>(), { side: 'top' })

const layout: Record<Side, string> = {
  top: 'flex-col',
  bottom: 'flex-col-reverse',
  left: 'flex-row',
  right: 'flex-row-reverse',
}
const arrow: Record<Side, string> = {
  top: 'border-x-[5px] border-t-[5px] border-x-transparent border-t-fg',
  bottom: 'border-x-[5px] border-b-[5px] border-x-transparent border-b-fg',
  left: 'border-y-[5px] border-l-[5px] border-y-transparent border-l-fg',
  right: 'border-y-[5px] border-r-[5px] border-y-transparent border-r-fg',
}
</script>

<template>
  <div role="tooltip" class="inline-flex items-center" :class="layout[props.side]">
    <div class="text-small rounded-sm bg-fg px-3 py-2 whitespace-nowrap text-app"><slot /></div>
    <span class="size-0 shrink-0" :class="arrow[props.side]" />
  </div>
</template>
