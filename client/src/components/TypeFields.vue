<script setup lang="ts">
import { ref } from 'vue'
import { batchRows, LIMITS, type Form, type TypeId } from '@/lib/payloads'
import { CSV_TEMPLATE } from '@/lib/csv'
import AlertBox from './ui/AlertBox.vue'
import AppIcon from './ui/AppIcon.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseTextarea from './ui/BaseTextarea.vue'
import ChipGroup from './ui/ChipGroup.vue'
import ToggleRow from './ui/ToggleRow.vue'

// Campos de "Conteúdo" de cada tipo (telas 02–14 do Figma).
const form = defineModel<Form>('form', { required: true })
defineProps<{ type: TypeId; error?: string }>()
defineEmits<{ touch: [] }>()

const TEXT_MAX = LIMITS.text
const SMS_MAX = LIMITS.sms
const fileInput = ref<HTMLInputElement>()
const dragging = ref(false)
const MAX_CSV_BYTES = 2_000_000

async function readCsv(file: File | undefined) {
  if (!file) return
  if (file.size > MAX_CSV_BYTES) {
    form.value.batch.raw = ''
    form.value.batch.fileName = ''
    csvError.value = 'Arquivo grande demais (limite de 2 MB).'
    return
  }
  csvError.value = ''
  form.value.batch.raw = await file.text()
  form.value.batch.fileName = file.name
}
const csvError = ref('')

function onDrop(e: DragEvent) {
  dragging.value = false
  void readCsv(e.dataTransfer?.files?.[0])
}

function downloadTemplate() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }))
  a.download = 'modelo-creative-qr.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const rows = () => {
  const r = batchRows(form.value.batch)
  return 'rows' in r ? r.rows : []
}
const securityOptions = [
  { value: 'WPA', label: 'WPA / WPA2' },
  { value: 'WEP', label: 'WEP' },
  { value: 'nopass', label: 'Sem senha' },
] as const
const mapsOptions = [
  { value: 'google', label: 'Google Maps' },
  { value: 'apple', label: 'Apple Maps' },
  { value: 'waze', label: 'Waze' },
] as const
</script>

<template>
  <div class="flex flex-col gap-4" @focusout="$emit('touch')">
    <!-- URL -->
    <template v-if="type === 'url'">
      <BaseInput v-model="form.url" label="URL de destino" placeholder="https://seusite.com/promo" :error="error" />
      <ToggleRow v-model="form.utm">Adicionar UTM (origem e campanha)</ToggleRow>
      <div v-if="form.utm" class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.utmSource" label="Origem (utm_source)" placeholder="instagram" />
        <BaseInput v-model="form.utmCampaign" label="Campanha (utm_campaign)" placeholder="lancamento" />
      </div>
    </template>

    <!-- Texto -->
    <template v-else-if="type === 'text'">
      <BaseTextarea v-model="form.text" label="Texto" placeholder="Escreva aqui" :rows="4" />
      <p class="text-data text-fg-3 text-right">{{ form.text.length }} / {{ TEXT_MAX }} caracteres</p>
    </template>

    <!-- Wi-Fi -->
    <template v-else-if="type === 'wifi'">
      <BaseInput v-model="form.wifi.ssid" label="Nome da rede (SSID)" placeholder="Casa-5G" />
      <BaseInput v-model="form.wifi.password" label="Senha" type="password" placeholder="••••••••••" :disabled="form.wifi.security === 'nopass'" />
      <ChipGroup v-model="form.wifi.security" label="Segurança" :options="[...securityOptions]" />
      <ToggleRow v-model="form.wifi.hidden">Rede oculta</ToggleRow>
    </template>

    <!-- vCard -->
    <template v-else-if="type === 'vcard'">
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.vcard.first" label="Nome" placeholder="Maria" />
        <BaseInput v-model="form.vcard.last" label="Sobrenome" placeholder="Souza" />
        <BaseInput v-model="form.vcard.company" label="Empresa" placeholder="Creative QR" />
        <BaseInput v-model="form.vcard.title" label="Cargo" placeholder="Designer" />
        <BaseInput v-model="form.vcard.phone" label="Telefone" type="tel" placeholder="+55 85 99999-0000" />
        <BaseInput v-model="form.vcard.email" label="E-mail" type="email" placeholder="maria@exemplo.com" />
      </div>
      <BaseInput v-model="form.vcard.site" label="Site" placeholder="https://exemplo.com" />
      <BaseInput v-model="form.vcard.address" label="Endereço" placeholder="Rua das Flores, 120 — Fortaleza, CE" />
    </template>

    <!-- WhatsApp (sem tela própria no Figma: mesmos campos de SMS) -->
    <template v-else-if="type === 'whatsapp'">
      <BaseInput v-model="form.whatsapp.phone" label="Número (com DDD)" type="tel" placeholder="+55 85 99999-0000" />
      <BaseTextarea v-model="form.whatsapp.message" label="Mensagem" placeholder="Olá! Quero saber mais." />
    </template>

    <!-- PIX -->
    <template v-else-if="type === 'pix'">
      <BaseInput v-model="form.pix.key" label="Chave Pix" placeholder="email, CPF, CNPJ, telefone ou chave aleatória" />
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.pix.name" label="Nome do beneficiário" placeholder="Nome completo" />
        <BaseInput v-model="form.pix.city" label="Cidade" placeholder="Fortaleza" />
        <BaseInput v-model="form.pix.amount" label="Valor (R$)" placeholder="25,00" />
        <BaseInput v-model="form.pix.description" label="Descrição" placeholder="Doação" />
      </div>
      <ToggleRow v-model="form.pix.fixed">Valor fixo (quem paga não pode alterar)</ToggleRow>
    </template>

    <!-- E-mail -->
    <template v-else-if="type === 'email'">
      <BaseInput v-model="form.email.to" label="Para" type="email" placeholder="contato@exemplo.com" />
      <BaseInput v-model="form.email.subject" label="Assunto" placeholder="Pedido de orçamento" />
      <BaseTextarea v-model="form.email.message" label="Mensagem" placeholder="Escreva a mensagem que já vem preenchida" />
    </template>

    <!-- Local -->
    <template v-else-if="type === 'geo'">
      <BaseInput v-model="form.geo.address" label="Endereço" placeholder="Av. Beira Mar, 1000 — Fortaleza, CE" />
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.geo.lat" label="Latitude" placeholder="-3.7319" />
        <BaseInput v-model="form.geo.lng" label="Longitude" placeholder="-38.5267" />
      </div>
      <p class="text-small text-fg-3">Com latitude e longitude o ponto é exato; só com o endereço, o app de mapas faz a busca.</p>
      <ChipGroup v-model="form.geo.app" label="Abrir no" :options="[...mapsOptions]" />
    </template>

    <!-- SMS -->
    <template v-else-if="type === 'sms'">
      <BaseInput v-model="form.sms.phone" label="Número" type="tel" placeholder="+55 85 99999-0000" />
      <BaseTextarea v-model="form.sms.message" label="Mensagem" placeholder="Olá! Quero saber mais." />
      <p class="text-data text-fg-3 text-right">{{ form.sms.message.length }} / {{ SMS_MAX }} caracteres</p>
    </template>

    <!-- Telefone -->
    <template v-else-if="type === 'tel'">
      <BaseInput v-model="form.tel.phone" label="Número de telefone" type="tel" placeholder="+55 85 99999-0000" />
    </template>

    <!-- Calendário -->
    <template v-else-if="type === 'event'">
      <BaseInput v-model="form.event.title" label="Título do evento" placeholder="Reunião de lançamento" />
      <BaseInput v-model="form.event.place" label="Local" placeholder="Sala 3 ou videochamada" />
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.event.startDate" label="Início — data" placeholder="22/10/2026" />
        <BaseInput v-model="form.event.startTime" label="Início — hora" placeholder="14:00" :disabled="form.event.allDay" />
        <BaseInput v-model="form.event.endDate" label="Fim — data" placeholder="22/10/2026" />
        <BaseInput v-model="form.event.endTime" label="Fim — hora" placeholder="15:30" :disabled="form.event.allDay" />
      </div>
      <BaseTextarea v-model="form.event.description" label="Descrição" placeholder="Pauta, links e materiais" />
      <ToggleRow v-model="form.event.allDay">Dia inteiro</ToggleRow>
    </template>

    <!-- Lote (CSV) -->
    <template v-else>
      <div
        class="flex flex-col items-center gap-3 rounded-sm border bg-surface p-8 text-center"
        :class="dragging ? 'border-focus' : 'border-line'"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
      >
        <AppIcon name="upload" class="text-fg-2" />
        <p class="text-body-medium">{{ form.batch.fileName || 'Arraste o CSV aqui' }}</p>
        <p class="text-small text-fg-2">Coluna “conteudo” obrigatória. Coluna “nome” opcional.</p>
        <div class="flex flex-wrap justify-center gap-2">
          <BaseButton variant="secondary" @click="fileInput?.click()">Escolher arquivo</BaseButton>
          <BaseButton variant="ghost" @click="downloadTemplate">Baixar modelo</BaseButton>
        </div>
        <input ref="fileInput" type="file" accept=".csv,text/csv" class="sr-only" aria-hidden="true" tabindex="-1" @change="readCsv(($event.target as HTMLInputElement).files?.[0])" />
      </div>
      <AlertBox v-if="csvError" kind="danger" title="Não foi possível ler o arquivo">{{ csvError }}</AlertBox>
      <template v-if="rows().length">
        <div class="text-data overflow-hidden rounded-sm border border-line">
          <div v-if="form.batch.header" class="flex gap-4 bg-sunken px-4 py-2.5 text-fg-2"><span class="w-30 shrink-0">nome</span><span class="min-w-0 flex-1">conteudo</span></div>
          <div v-for="(r, i) in rows().slice(0, 4)" :key="i" class="flex gap-4 border-t border-line px-4 py-2.5 first:border-t-0">
            <span class="w-30 shrink-0 truncate">{{ r.name }}</span>
            <span class="min-w-0 flex-1 truncate">{{ r.content }}</span>
          </div>
        </div>
        <p class="text-small text-fg-2">{{ rows().length }} linhas lidas · {{ rows().length }} QR codes serão gerados</p>
      </template>
      <ToggleRow v-model="form.batch.header">Primeira linha é cabeçalho</ToggleRow>
    </template>

    <p v-if="error && type !== 'url'" class="text-small text-danger" role="alert">{{ error }}</p>
  </div>
</template>
