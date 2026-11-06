import { ref } from 'vue'
import en from './en'
import ptBR from './pt-BR'

export type Locale = 'pt-BR' | 'en'
export const LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: 'pt-BR', label: 'Português (Brasil)', short: 'PT' },
  { id: 'en', label: 'English', short: 'EN' },
]

type Dict = { [k: string]: string | Dict }
const dicts: Record<Locale, Dict> = { 'pt-BR': ptBR, en }
export const LANG_KEY = 'creative-qr:lang' // categoria "necessário": guarda só a escolha do idioma

function initial(): Locale {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'pt-BR' || saved === 'en') return saved
  } catch {
    // sem acesso ao localStorage: cai na detecção abaixo
  }
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export const locale = ref<Locale>(initial())
if (typeof document !== 'undefined') document.documentElement.lang = locale.value

export function setLocale(l: Locale) {
  locale.value = l
  document.documentElement.lang = l
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    // modo privado/cota: o idioma vale só nesta sessão
  }
}

function lookup(dict: Dict, path: string): string | undefined {
  let cur: string | Dict | undefined = dict
  for (const part of path.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined
    cur = cur[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

export type Params = Record<string, string | number>

/** Traduz `chave.com.pontos`. Lê `locale`, então o template reage à troca de idioma. */
export function t(key: string, params?: Params): string {
  const raw = lookup(dicts[locale.value], key) ?? lookup(dicts['pt-BR'], key) ?? key
  return params ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : raw
}
