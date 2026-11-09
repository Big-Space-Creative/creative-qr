import { csvToRows, parseCsv } from './csv'
import { hasBlockedUrl } from './blocklist'
import { normalizeUrl } from './qr'

export type TypeId =
  | 'url' | 'text' | 'wifi' | 'vcard' | 'whatsapp' | 'pix' | 'email' | 'geo' | 'sms' | 'tel' | 'event' | 'batch'

export interface CsvRow {
  name: string
  content: string
}

export interface Form {
  url: string
  utm: boolean
  utmSource: string
  utmCampaign: string
  text: string
  wifi: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean }
  vcard: { first: string; last: string; company: string; title: string; phone: string; email: string; site: string; address: string }
  whatsapp: { phone: string; message: string }
  pix: { key: string; name: string; city: string; amount: string; description: string; fixed: boolean }
  email: { to: string; subject: string; message: string }
  geo: { address: string; lat: string; lng: string; app: 'google' | 'apple' | 'waze' }
  sms: { phone: string; message: string }
  tel: { phone: string }
  event: { title: string; place: string; startDate: string; startTime: string; endDate: string; endTime: string; description: string; allDay: boolean }
  batch: { raw: string; header: boolean; fileName: string }
}

export function emptyForm(): Form {
  return {
    url: '',
    utm: false,
    utmSource: '',
    utmCampaign: '',
    text: '',
    wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
    vcard: { first: '', last: '', company: '', title: '', phone: '', email: '', site: '', address: '' },
    whatsapp: { phone: '', message: '' },
    pix: { key: '', name: '', city: '', amount: '', description: '', fixed: false },
    email: { to: '', subject: '', message: '' },
    geo: { address: '', lat: '', lng: '', app: 'google' },
    sms: { phone: '', message: '' },
    tel: { phone: '' },
    event: { title: '', place: '', startDate: '', startTime: '', endDate: '', endTime: '', description: '', allDay: false },
    batch: { raw: '', header: true, fileName: '' },
  }
}

/** payload = conteúdo do QR; error = mensagem para o usuário; null = ainda vazio (sem erro). */
export type Built = { payload: string } | { error: string; params?: Record<string, string | number> } | null

export const LIMITS = { text: 2000, sms: 160 }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const err = (error: string, params?: Record<string, string | number>): Built => ({ error, params })
const blank = (...v: string[]) => v.every((x) => !x.trim())

/** Mantém só + e dígitos. */
function phoneDigits(raw: string): string {
  const t = raw.trim()
  return (t.startsWith('+') ? '+' : '') + t.replace(/\D/g, '')
}

// --- escapes por formato
const escWifi = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
const escVcard = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([;,])/g, '\\$1')
const escIcal = escVcard

// --- PIX (BR Code estático, EMV QRCPS-MPM)
export function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

const tlv = (id: string, v: string) => `${id}${String(v.length).padStart(2, '0')}${v}`

/** Maiúsculas, sem acento e só ASCII imprimível, como o BR Code exige. */
function pixText(s: string, max: number): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max)
}

function parseAmount(raw: string): number | null {
  const t = raw.trim().replace(/\./g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

export function pixPayload(p: Form['pix']): Built {
  if (blank(p.key, p.name, p.city, p.amount, p.description)) return null
  const key = p.key.trim().startsWith('+') ? phoneDigits(p.key) : p.key.trim()
  if (!key) return err('err.pixKey')
  if (key.length > 77) return err('err.pixKeyLong')
  const name = pixText(p.name, 25)
  const city = pixText(p.city, 15)
  if (!name) return err('err.pixName')
  if (!city) return err('err.pixCity')
  const amount = parseAmount(p.amount)
  if (Number.isNaN(amount) || (amount !== null && (amount <= 0 || amount > 9_999_999_999.99))) {
    return err('err.pixAmount')
  }
  if (p.fixed && amount === null) return err('err.pixFixed')
  const desc = pixText(p.description, 40)
  const account = tlv('00', 'br.gov.bcb.pix') + tlv('01', key) + (desc ? tlv('02', desc) : '')
  if (account.length > 99) return err('err.pixLong')
  const body =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('26', account) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (p.fixed && amount !== null ? tlv('54', amount.toFixed(2)) : '') +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', tlv('05', '***')) +
    '6304'
  return { payload: body + crc16(body) }
}

// --- data/hora (dd/mm/aaaa, hh:mm)
function parseDate(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim())
  if (!m) return null
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? { y, m: mo, d } : null
}
function parseTime(s: string): { h: number; min: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const [h, min] = [Number(m[1]), Number(m[2])]
  return h < 24 && min < 60 ? { h, min } : null
}
const p2 = (n: number) => String(n).padStart(2, '0')
const icalDate = (d: { y: number; m: number; d: number }) => `${d.y}${p2(d.m)}${p2(d.d)}`
const icalTime = (t: { h: number; min: number }) => `T${p2(t.h)}${p2(t.min)}00`

function eventPayload(e: Form['event']): Built {
  if (blank(e.title, e.place, e.startDate, e.startTime, e.endDate, e.endTime, e.description)) return null
  if (!e.title.trim()) return err('err.eventTitle')
  const sd = parseDate(e.startDate)
  if (!sd) return err('err.eventStartDate')
  const ed = e.endDate.trim() ? parseDate(e.endDate) : sd
  if (!ed) return err('err.eventEndDate')
  let dtstart: string
  let dtend: string
  if (e.allDay) {
    const endExclusive = new Date(ed.y, ed.m - 1, ed.d + 1) // DTEND de dia inteiro é exclusivo
    dtstart = `DTSTART;VALUE=DATE:${icalDate(sd)}`
    dtend = `DTEND;VALUE=DATE:${icalDate({ y: endExclusive.getFullYear(), m: endExclusive.getMonth() + 1, d: endExclusive.getDate() })}`
    if (endExclusive.getTime() <= new Date(sd.y, sd.m - 1, sd.d).getTime()) return err('err.eventOrder')
  } else {
    const st = parseTime(e.startTime)
    if (!st) return err('err.eventStartTime')
    const et = e.endTime.trim() ? parseTime(e.endTime) : st
    if (!et) return err('err.eventEndTime')
    const a = new Date(sd.y, sd.m - 1, sd.d, st.h, st.min).getTime()
    const b = new Date(ed.y, ed.m - 1, ed.d, et.h, et.min).getTime()
    if (b < a) return err('err.eventOrder')
    dtstart = `DTSTART:${icalDate(sd)}${icalTime(st)}`
    dtend = `DTEND:${icalDate(ed)}${icalTime(et)}`
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${escIcal(e.title.trim())}`,
    ...(e.place.trim() ? [`LOCATION:${escIcal(e.place.trim())}`] : []),
    dtstart,
    dtend,
    ...(e.description.trim() ? [`DESCRIPTION:${escIcal(e.description.trim())}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return { payload: lines.join('\r\n') }
}

function vcardPayload(v: Form['vcard']): Built {
  if (blank(...Object.values(v))) return null
  if (blank(v.first, v.last, v.company)) return err('err.vcardName')
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) return err('err.email')
  let site = ''
  if (v.site.trim()) {
    const r = normalizeUrl(v.site)
    if (!r) return err('err.site')
    if ('error' in r) return err(r.error === 'err.blockedUrl' ? r.error : 'err.site')
    site = r.url
  }
  const fn = `${v.first.trim()} ${v.last.trim()}`.trim() || v.company.trim()
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escVcard(v.last.trim())};${escVcard(v.first.trim())};;;`,
    `FN:${escVcard(fn)}`,
    ...(v.company.trim() ? [`ORG:${escVcard(v.company.trim())}`] : []),
    ...(v.title.trim() ? [`TITLE:${escVcard(v.title.trim())}`] : []),
    ...(v.phone.trim() ? [`TEL;TYPE=CELL:${phoneDigits(v.phone)}`] : []),
    ...(v.email.trim() ? [`EMAIL:${v.email.trim()}`] : []),
    ...(site ? [`URL:${site}`] : []),
    ...(v.address.trim() ? [`ADR;TYPE=WORK:;;${escVcard(v.address.trim())};;;;`] : []),
    'END:VCARD',
  ]
  return { payload: lines.join('\r\n') }
}

function geoPayload(g: Form['geo']): Built {
  if (blank(g.address, g.lat, g.lng)) return null
  const hasCoords = !!(g.lat.trim() || g.lng.trim())
  let ll = ''
  if (hasCoords) {
    const lat = Number(g.lat.trim().replace(',', '.'))
    const lng = Number(g.lng.trim().replace(',', '.'))
    if (!g.lat.trim() || !g.lng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return err('err.geoCoords')
    }
    ll = `${lat},${lng}`
  } else if (!g.address.trim()) {
    return null
  }
  const q = encodeURIComponent(ll || g.address.trim())
  // Com coordenadas elas têm prioridade; sem elas o app de mapas resolve o endereço.
  const urls = {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: ll ? `https://maps.apple.com/?ll=${ll}&q=${encodeURIComponent(g.address.trim() || ll)}` : `https://maps.apple.com/?q=${q}`,
    waze: ll ? `https://waze.com/ul?ll=${ll}&navigate=yes` : `https://waze.com/ul?q=${q}&navigate=yes`,
  }
  return { payload: urls[g.app] }
}

/** Linhas do CSV carregado (ou o erro de leitura). */
export function batchRows(b: Form['batch']): { rows: CsvRow[] } | { error: string; params?: Record<string, string | number> } {
  const r = csvToRows(parseCsv(b.raw), b.header)
  if ('error' in r) return r
  const bad = r.rows.findIndex((x) => hasBlockedUrl(x.content))
  return bad < 0 ? r : { error: 'err.blockedBatch', params: { n: bad + 1 } }
}

export function buildPayload(type: TypeId, f: Form): Built {
  switch (type) {
    case 'url': {
      const r = normalizeUrl(f.url)
      if (!r || 'error' in r) return r
      if (!f.utm) return { payload: r.url }
      const u = new URL(r.url)
      if (f.utmSource.trim()) u.searchParams.set('utm_source', f.utmSource.trim())
      if (f.utmCampaign.trim()) u.searchParams.set('utm_campaign', f.utmCampaign.trim())
      return { payload: u.toString() }
    }
    case 'text': {
      const t = f.text.trim()
      if (!t) return null
      if (hasBlockedUrl(t)) return err('err.blockedUrl')
      return t.length > LIMITS.text ? err('err.limitChars', { n: LIMITS.text }) : { payload: t }
    }
    case 'wifi': {
      const w = f.wifi
      if (blank(w.ssid, w.password)) return null
      if (!w.ssid.trim()) return err('err.wifiSsid')
      if (w.security !== 'nopass' && !w.password) return err('err.wifiPass')
      const parts = [`T:${w.security}`, `S:${escWifi(w.ssid)}`]
      if (w.security !== 'nopass') parts.push(`P:${escWifi(w.password)}`)
      if (w.hidden) parts.push('H:true')
      return { payload: `WIFI:${parts.join(';')};;` }
    }
    case 'vcard':
      return vcardPayload(f.vcard)
    case 'whatsapp': {
      if (blank(f.whatsapp.phone, f.whatsapp.message)) return null
      let d = phoneDigits(f.whatsapp.phone).replace('+', '')
      if (d.length === 10 || d.length === 11) d = `55${d}` // número brasileiro sem DDI
      if (d.length < 11 || d.length > 15) return err('err.phoneLong')
      const msg = f.whatsapp.message.trim()
      return { payload: `https://wa.me/${d}${msg ? `?text=${encodeURIComponent(msg)}` : ''}` }
    }
    case 'pix':
      return pixPayload(f.pix)
    case 'email': {
      const e = f.email
      if (blank(e.to, e.subject, e.message)) return null
      if (!EMAIL_RE.test(e.to.trim())) return err('err.emailTo')
      const q = [
        e.subject.trim() && `subject=${encodeURIComponent(e.subject.trim())}`,
        e.message.trim() && `body=${encodeURIComponent(e.message.trim())}`,
      ].filter(Boolean)
      return { payload: `mailto:${e.to.trim()}${q.length ? `?${q.join('&')}` : ''}` }
    }
    case 'geo':
      return geoPayload(f.geo)
    case 'sms': {
      if (blank(f.sms.phone, f.sms.message)) return null
      const n = phoneDigits(f.sms.phone)
      if (n.replace('+', '').length < 8) return err('err.phone')
      if (f.sms.message.length > LIMITS.sms) return err('err.limitChars', { n: LIMITS.sms })
      return { payload: `SMSTO:${n}:${f.sms.message}` }
    }
    case 'tel': {
      if (blank(f.tel.phone)) return null
      const n = phoneDigits(f.tel.phone)
      return n.replace('+', '').length < 8 ? err('err.phone') : { payload: `tel:${n}` }
    }
    case 'event':
      return eventPayload(f.event)
    case 'batch': {
      if (!f.batch.raw.trim()) return null
      const r = batchRows(f.batch)
      if ('error' in r) return r
      return { payload: r.rows[0]?.content ?? '' } // a prévia mostra a primeira linha; o ZIP gera todas
    }
  }
}

export const TYPE_IDS: readonly TypeId[] = ['url', 'text', 'wifi', 'vcard', 'whatsapp', 'pix', 'email', 'geo', 'sms', 'tel', 'event', 'batch']

type Fields = Record<string, string | boolean>
const TOP_KEYS: Partial<Record<TypeId, (keyof Form)[]>> = {
  url: ['url', 'utm', 'utmSource', 'utmCampaign'],
  text: ['text'],
}

/** Campos do formulário de um tipo, para reabrir o item depois. Lote não entra (arquivo grande). */
export function snapshot(type: TypeId, f: Form): Fields | undefined {
  if (type === 'batch') return undefined
  const top = TOP_KEYS[type]
  if (top) return Object.fromEntries(top.map((k) => [k, f[k]])) as Fields
  return { ...(f[type as keyof Form] as Fields) }
}

/** Copia só chaves conhecidas, com o mesmo tipo do modelo vazio. Entrada externa (arquivo/localStorage). */
export function pickFields(type: TypeId, raw: unknown): Fields | undefined {
  if (!raw || typeof raw !== 'object' || type === 'batch') return undefined
  const model = (snapshot(type, emptyForm()) ?? {}) as Fields
  const out: Fields = {}
  for (const [k, def] of Object.entries(model)) {
    const v = (raw as Fields)[k]
    if (v !== undefined && typeof v === typeof def && (typeof v !== 'string' || v.length <= 2000)) out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

export function restore(type: TypeId, fields: Fields | undefined, f: Form) {
  const clean = pickFields(type, fields)
  if (!clean) return
  const top = TOP_KEYS[type]
  Object.assign(top ? f : (f[type as keyof Form] as object), clean)
}

/** Nome curto para o card de Recentes. */
export function labelFor(type: TypeId, f: Form, payload: string): string {
  const clip = (s: string) => s.trim().slice(0, 28)
  switch (type) {
    case 'url':
      try {
        return new URL(payload).hostname.replace(/^www\./, '')
      } catch {
        return clip(payload)
      }
    case 'wifi':
      return clip(f.wifi.ssid)
    case 'vcard':
      return clip(`${f.vcard.first} ${f.vcard.last}`) || clip(f.vcard.company)
    case 'whatsapp':
      return clip(f.whatsapp.phone)
    case 'pix':
      return clip(f.pix.name)
    case 'email':
      return clip(f.email.to)
    case 'geo':
      return clip(f.geo.address) || clip(`${f.geo.lat}, ${f.geo.lng}`)
    case 'sms':
      return clip(f.sms.phone)
    case 'tel':
      return clip(f.tel.phone)
    case 'event':
      return clip(f.event.title)
    default:
      return clip(payload)
  }
}
