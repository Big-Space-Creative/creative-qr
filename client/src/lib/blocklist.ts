import { BLOCKED_HOSTS } from './blocklist.data'

// Bloqueio de links de golpe/ilícitos antes de gerar o QR. Roda só no navegador.
// Lista importada: `pnpm blocklist:update` (feeds públicos) -> blocklist.data.ts.
// ponytail: lista estática; encurtadores e domínios novos passam.
// Upgrade: consulta a Safe Browsing via backend, se um dia existir.

/** Domínios bloqueados (inclui subdomínios). */
const DOMAINS = [
  // rastreadores de IP
  'grabify.link', 'iplogger.org', 'iplogger.com', 'iplogger.ru', 'ipgrabber.ru', '2no.co', 'yip.su', 'blasze.com', 'leancoding.co', 'stopify.co',
  // conteúdo adulto
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com', 'youporn.com', 'spankbang.com', 'chaturbate.com',
  // pirataria
  'thepiratebay.org', '1337x.to', 'yts.mx', 'torrentz2.eu', 'rarbg.to', 'nyaa.si',
]

/** Trechos que, no host, já indicam conteúdo proibido. */
const HOST_WORDS = ['porn', 'xvideos', 'xnxx', 'hentai', 'iplogger', 'grabify', 'tigrinho', 'robux-free', 'freerobux', 'phishing']

/** Marca -> domínios oficiais. Host que cita a marca mas não é oficial é tratado como falsificação. */
const BRANDS: Record<string, string[]> = {
  nubank: ['nubank.com.br'],
  bradesco: ['bradesco.com.br', 'bradesco'],
  itau: ['itau.com.br', 'itau.com'],
  caixa: ['caixa.gov.br'],
  mercadopago: ['mercadopago.com', 'mercadopago.com.br', 'mercadopago.com.ar'],
  paypal: ['paypal.com', 'paypal.me'],
  'gov-br': ['gov.br'],
  govbr: ['gov.br'],
  receitafederal: ['gov.br'],
}

const onDomain = (host: string, d: string) => host === d || host.endsWith(`.${d}`)

/** Host exato ou qualquer domínio-pai presente na lista importada (a.b.com -> b.com). */
function inFeed(host: string): boolean {
  for (let h = host; h.includes('.'); h = h.slice(h.indexOf('.') + 1)) if (BLOCKED_HOSTS.has(h)) return true
  return false
}

/** true se a URL aponta para um destino bloqueado. Entrada inválida devolve false. */
export function isBlockedUrl(raw: string): boolean {
  let host: string
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return false
  }
  if (DOMAINS.some((d) => onDomain(host, d))) return true
  if (inFeed(host)) return true
  if (HOST_WORDS.some((w) => host.includes(w))) return true
  const flat = host.replace(/[.-]/g, '')
  return Object.entries(BRANDS).some(
    ([brand, official]) => (host.includes(brand) || flat.includes(brand.replace('-', ''))) && !official.some((d) => onDomain(host, d)),
  )
}

const URL_LIKE = /(?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?/gi

/** Procura links dentro de um texto livre e informa se algum é bloqueado. */
export function hasBlockedUrl(text: string): boolean {
  return (text.match(URL_LIKE) ?? []).some(isBlockedUrl)
}
