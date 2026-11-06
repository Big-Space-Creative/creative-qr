<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@/i18n'
import { batchRows, LIMITS, type Form, type TypeId } from '@/lib/payloads'
import { csvTemplate } from '@/lib/csv'
import AlertBox from './ui/AlertBox.vue'
import AppIcon from './ui/AppIcon.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseTextarea from './ui/BaseTextarea.vue'
import ChipGroup from './ui/ChipGroup.vue'
import ToggleRow from './ui/ToggleRow.vue'

// Campos de "Conteúdo" de cada tipo (telas 02–14 do Figma). `error` já vem traduzido.
const form = defineModel<Form>('form', { required: true })
defineProps<{ type: TypeId; error?: string }>()
defineEmits<{ touch: [] }>()

const TEXT_MAX = LIMITS.text
const SMS_MAX = LIMITS.sms
const fileInput = ref<HTMLInputElement>()
const dragging = ref(false)
const csvError = ref('') // chave de tradução
const MAX_CSV_BYTES = 2_000_000

async function readCsv(file: File | undefined) {
  if (!file) return
  if (file.size > MAX_CSV_BYTES) {
    form.value.batch.raw = ''
    form.value.batch.fileName = ''
    csvError.value = 'err.csvTooBig'
    return
  }
  csvError.value = ''
  form.value.batch.raw = await file.text()
  form.value.batch.fileName = file.name
}

function onDrop(e: DragEvent) {
  dragging.value = false
  void readCsv(e.dataTransfer?.files?.[0])
}

function downloadTemplate() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csvTemplate(t('fields.csvName'), t('fields.csvContent'))], { type: 'text/csv' }))
  a.download = 'creative-qr-template.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const rows = () => {
  const r = batchRows(form.value.batch)
  return 'rows' in r ? r.rows : []
}
const securityOptions = () =>
  [
    { value: 'WPA', label: t('fields.wifiWpa') },
    { value: 'WEP', label: t('fields.wifiWep') },
    { value: 'nopass', label: t('fields.wifiNone') },
  ] as const
const mapsOptions = () =>
  [
    { value: 'google', label: t('fields.google') },
    { value: 'apple', label: t('fields.apple') },
    { value: 'waze', label: t('fields.waze') },
  ] as const
</script>

<template>
  <div class="flex flex-col gap-4" @focusout="$emit('touch')">
    <!-- URL -->
    <template v-if="type === 'url'">
      <BaseInput v-model="form.url" :label="t('fields.url.label')" :placeholder="t('fields.url.placeholder')" :error="error" />
      <ToggleRow v-model="form.utm">{{ t('fields.utm') }}</ToggleRow>
      <div v-if="form.utm" class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.utmSource" :label="t('fields.utmSource')" :placeholder="t('fields.utmSourcePh')" />
        <BaseInput v-model="form.utmCampaign" :label="t('fields.utmCampaign')" :placeholder="t('fields.utmCampaignPh')" />
      </div>
    </template>

    <!-- Texto -->
    <template v-else-if="type === 'text'">
      <BaseTextarea v-model="form.text" :label="t('fields.text')" :placeholder="t('fields.textPh')" :rows="4" />
      <p class="text-data text-fg-3 text-right">{{ t('fields.counter', { n: form.text.length, max: TEXT_MAX }) }}</p>
    </template>

    <!-- Wi-Fi -->
    <template v-else-if="type === 'wifi'">
      <BaseInput v-model="form.wifi.ssid" :label="t('fields.wifiSsid')" :placeholder="t('fields.wifiSsidPh')" />
      <BaseInput v-model="form.wifi.password" :label="t('fields.wifiPassword')" type="password" placeholder="••••••••••" :disabled="form.wifi.security === 'nopass'" />
      <ChipGroup v-model="form.wifi.security" :label="t('fields.wifiSecurity')" :options="[...securityOptions()]" />
      <ToggleRow v-model="form.wifi.hidden">{{ t('fields.wifiHidden') }}</ToggleRow>
    </template>

    <!-- vCard -->
    <template v-else-if="type === 'vcard'">
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.vcard.first" :label="t('fields.first')" :placeholder="t('fields.firstPh')" />
        <BaseInput v-model="form.vcard.last" :label="t('fields.last')" :placeholder="t('fields.lastPh')" />
        <BaseInput v-model="form.vcard.company" :label="t('fields.company')" :placeholder="t('fields.companyPh')" />
        <BaseInput v-model="form.vcard.title" :label="t('fields.jobTitle')" :placeholder="t('fields.jobTitlePh')" />
        <BaseInput v-model="form.vcard.phone" :label="t('fields.phone')" type="tel" placeholder="+55 85 99999-0000" />
        <BaseInput v-model="form.vcard.email" :label="t('fields.email')" type="email" placeholder="maria@example.com" />
      </div>
      <BaseInput v-model="form.vcard.site" :label="t('fields.site')" :placeholder="t('fields.sitePh')" />
      <BaseInput v-model="form.vcard.address" :label="t('fields.address')" :placeholder="t('fields.addressPh')" />
    </template>

    <!-- WhatsApp (sem tela própria no Figma: mesmos campos de SMS) -->
    <template v-else-if="type === 'whatsapp'">
      <BaseInput v-model="form.whatsapp.phone" :label="t('fields.waPhone')" type="tel" placeholder="+55 85 99999-0000" />
      <BaseTextarea v-model="form.whatsapp.message" :label="t('fields.message')" :placeholder="t('fields.messagePh')" />
    </template>

    <!-- PIX -->
    <template v-else-if="type === 'pix'">
      <BaseInput v-model="form.pix.key" :label="t('fields.pixKey')" :placeholder="t('fields.pixKeyPh')" />
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.pix.name" :label="t('fields.pixName')" :placeholder="t('fields.pixNamePh')" />
        <BaseInput v-model="form.pix.city" :label="t('fields.pixCity')" :placeholder="t('fields.pixCityPh')" />
        <BaseInput v-model="form.pix.amount" :label="t('fields.pixAmount')" :placeholder="t('fields.pixAmountPh')" />
        <BaseInput v-model="form.pix.description" :label="t('fields.pixDescription')" :placeholder="t('fields.pixDescriptionPh')" />
      </div>
      <ToggleRow v-model="form.pix.fixed">{{ t('fields.pixFixed') }}</ToggleRow>
    </template>

    <!-- E-mail -->
    <template v-else-if="type === 'email'">
      <BaseInput v-model="form.email.to" :label="t('fields.emailTo')" type="email" :placeholder="t('fields.emailToPh')" />
      <BaseInput v-model="form.email.subject" :label="t('fields.emailSubject')" :placeholder="t('fields.emailSubjectPh')" />
      <BaseTextarea v-model="form.email.message" :label="t('fields.emailBody')" :placeholder="t('fields.emailBodyPh')" />
    </template>

    <!-- Local -->
    <template v-else-if="type === 'geo'">
      <BaseInput v-model="form.geo.address" :label="t('fields.geoAddress')" :placeholder="t('fields.geoAddressPh')" />
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.geo.lat" :label="t('fields.lat')" placeholder="-3.7319" />
        <BaseInput v-model="form.geo.lng" :label="t('fields.lng')" placeholder="-38.5267" />
      </div>
      <p class="text-small text-fg-3">{{ t('fields.geoHint') }}</p>
      <ChipGroup v-model="form.geo.app" :label="t('fields.openIn')" :options="[...mapsOptions()]" />
    </template>

    <!-- SMS -->
    <template v-else-if="type === 'sms'">
      <BaseInput v-model="form.sms.phone" :label="t('fields.smsPhone')" type="tel" placeholder="+55 85 99999-0000" />
      <BaseTextarea v-model="form.sms.message" :label="t('fields.message')" :placeholder="t('fields.messagePh')" />
      <p class="text-data text-fg-3 text-right">{{ t('fields.counter', { n: form.sms.message.length, max: SMS_MAX }) }}</p>
    </template>

    <!-- Telefone -->
    <template v-else-if="type === 'tel'">
      <BaseInput v-model="form.tel.phone" :label="t('fields.telPhone')" type="tel" placeholder="+55 85 99999-0000" />
    </template>

    <!-- Calendário -->
    <template v-else-if="type === 'event'">
      <BaseInput v-model="form.event.title" :label="t('fields.eventTitle')" :placeholder="t('fields.eventTitlePh')" />
      <BaseInput v-model="form.event.place" :label="t('fields.eventPlace')" :placeholder="t('fields.eventPlacePh')" />
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.event.startDate" :label="t('fields.startDate')" :placeholder="t('fields.datePh')" />
        <BaseInput v-model="form.event.startTime" :label="t('fields.startTime')" :placeholder="t('fields.timePh')" :disabled="form.event.allDay" />
        <BaseInput v-model="form.event.endDate" :label="t('fields.endDate')" :placeholder="t('fields.datePh')" />
        <BaseInput v-model="form.event.endTime" :label="t('fields.endTime')" :placeholder="t('fields.endTimePh')" :disabled="form.event.allDay" />
      </div>
      <BaseTextarea v-model="form.event.description" :label="t('fields.eventDescription')" :placeholder="t('fields.eventDescriptionPh')" />
      <ToggleRow v-model="form.event.allDay">{{ t('fields.allDay') }}</ToggleRow>
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
        <p class="text-body-medium">{{ form.batch.fileName || t('fields.csvDrop') }}</p>
        <p class="text-small text-fg-2">{{ t('fields.csvHint') }}</p>
        <div class="flex flex-wrap justify-center gap-2">
          <BaseButton variant="secondary" @click="fileInput?.click()">{{ t('fields.csvChoose') }}</BaseButton>
          <BaseButton variant="ghost" @click="downloadTemplate">{{ t('fields.csvTemplate') }}</BaseButton>
        </div>
        <input ref="fileInput" type="file" accept=".csv,text/csv" class="sr-only" aria-hidden="true" tabindex="-1" @change="readCsv(($event.target as HTMLInputElement).files?.[0])" />
      </div>
      <AlertBox v-if="csvError" kind="danger" :title="t('fields.csvErrorTitle')">{{ t(csvError) }}</AlertBox>
      <template v-if="rows().length">
        <div class="text-data overflow-hidden rounded-sm border border-line">
          <div v-if="form.batch.header" class="flex gap-4 bg-sunken px-4 py-2.5 text-fg-2">
            <span class="w-30 shrink-0">{{ t('fields.csvName') }}</span><span class="min-w-0 flex-1">{{ t('fields.csvContent') }}</span>
          </div>
          <div v-for="(r, i) in rows().slice(0, 4)" :key="i" class="flex gap-4 border-t border-line px-4 py-2.5 first:border-t-0">
            <span class="w-30 shrink-0 truncate">{{ r.name }}</span>
            <span class="min-w-0 flex-1 truncate">{{ r.content }}</span>
          </div>
        </div>
        <p class="text-small text-fg-2">{{ t('fields.csvRows', { n: rows().length }) }}</p>
      </template>
      <ToggleRow v-model="form.batch.header">{{ t('fields.csvHeader') }}</ToggleRow>
    </template>

    <p v-if="error && type !== 'url'" class="text-small text-danger" role="alert">{{ error }}</p>
  </div>
</template>
