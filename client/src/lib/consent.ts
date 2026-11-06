import { computed, ref } from 'vue'

// Preferências de armazenamento (Figma: telas 18 e 19).
// "Necessário" (esta escolha e o idioma) é sempre guardado. "Recentes" só com permissão.
export const CONSENT_KEY = 'creative-qr:consent'
export const RECENTS_KEY = 'creative-qr:recentes:v1'

interface Consent {
  v: 1
  recents: boolean
  at: number
}

function load(): Consent | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null')
    return raw && raw.v === 1 && typeof raw.recents === 'boolean' ? (raw as Consent) : null
  } catch {
    return null
  }
}

export const consent = ref<Consent | null>(load())
/** Já houve escolha? Enquanto não, o aviso aparece. */
export const decided = computed(() => consent.value !== null)
export const recentsAllowed = computed(() => !!consent.value?.recents)
/** Modal de preferências aberto (compartilhado entre o aviso e o link "Cookies" do header). */
export const preferencesOpen = ref(false)

export function setConsent(recents: boolean) {
  consent.value = { v: 1, recents, at: Date.now() }
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent.value))
    if (!recents) localStorage.removeItem(RECENTS_KEY) // recusou: nada de Recentes no disco
  } catch {
    // sem acesso ao localStorage: a escolha vale só nesta sessão
  }
}
