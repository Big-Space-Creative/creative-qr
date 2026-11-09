import { describe, expect, it } from 'vitest'
import { hasBlockedUrl, isBlockedUrl } from './blocklist'
import { buildPayload, emptyForm } from './payloads'

describe('blocklist', () => {
  it.each(['grabify.link/abc', 'https://sub.iplogger.org/x', 'pornhub.com', 'https://nubank-seguro.com/login', 'meu-gov-br.com', 'https://jogo-do-tigrinho.com'])(
    'bloqueia %s',
    (u) => expect(isBlockedUrl(u)).toBe(true),
  )
  it.each(['https://example.com/promo', 'https://www.nubank.com.br/', 'https://meu.gov.br/x', 'https://essex.ac.uk', 'https://paypal.me/joao'])(
    'libera %s',
    (u) => expect(isBlockedUrl(u)).toBe(false),
  )
  it('acha link dentro de texto', () => {
    expect(hasBlockedUrl('veja grabify.link/x agora')).toBe(true)
    expect(hasBlockedUrl('olá, tudo bem? arquivo.zip')).toBe(false)
  })
  it('buildPayload recusa url, site do vCard e texto', () => {
    const f = emptyForm()
    f.url = 'iplogger.org/a'
    expect(buildPayload('url', f)).toEqual({ error: 'err.blockedUrl' })
    f.vcard.first = 'A'
    f.vcard.site = 'iplogger.org'
    expect(buildPayload('vcard', f)).toMatchObject({ error: 'err.blockedUrl' })
    f.text = 'acesse iplogger.org'
    expect(buildPayload('text', f)).toMatchObject({ error: 'err.blockedUrl' })
  })
})
