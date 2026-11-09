<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '@/i18n'
import { consent, preferencesOpen, setConsent } from '@/lib/consent'
import { clearRecents } from '@/lib/recents'
import BaseButton from './ui/BaseButton.vue'
import ModalDialog from './ui/ModalDialog.vue'
import PreferenceRow from './ui/PreferenceRow.vue'

// Modal "Preferências de armazenamento" (Figma: tela 19). Recentes começa desligado até haver escolha.
const recents = ref(false)
watch(preferencesOpen, (open) => {
  if (open) recents.value = consent.value?.recents ?? false
})

const stored = [
  { key: 'creative-qr:consent', tag: 'consent.tagNecessary' },
  { key: 'creative-qr:lang', tag: 'consent.tagNecessary' },
  { key: 'creative-qr:tutorial:v1', tag: 'consent.tagNecessary' },
  { key: 'creative-qr:recentes:v1', tag: 'consent.tagRecents' },
]

function save() {
  setConsent(recents.value)
  preferencesOpen.value = false
}
function acceptAll() {
  setConsent(true)
}
</script>

<template>
  <ModalDialog
    v-model:open="preferencesOpen"
    :title="t('consent.modalTitle')"
    :description="t('consent.modalDesc')"
    :confirm-label="t('consent.save')"
    :cancel-label="t('consent.acceptAll')"
    @confirm="save"
    @cancel="acceptAll"
  >
    <div class="flex flex-col gap-4">
      <div>
        <PreferenceRow
          :title="t('consent.necessaryTitle')"
          :description="t('consent.necessaryDesc')"
          fixed
        />
        <PreferenceRow
          v-model="recents"
          :title="t('consent.recentsTitle')"
          :description="t('consent.recentsDesc')"
        />
      </div>
      <div class="flex flex-col gap-1">
        <p class="text-small text-fg-2">{{ t('consent.saved') }}</p>
        <div
          v-for="s in stored"
          :key="s.key"
          class="text-data flex items-center justify-between gap-2"
        >
          <span class="text-fg">{{ s.key }}</span>
          <span class="text-fg-2">{{ t(s.tag) }}</span>
        </div>
      </div>
      <BaseButton variant="ghost" class="self-start" @click="clearRecents()">{{
        t('consent.clear')
      }}</BaseButton>
    </div>
  </ModalDialog>
</template>
