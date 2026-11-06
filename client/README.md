# client

Vue 3 + Vite + Tailwind CSS v4. Gerador de QR code que roda inteiro no navegador (sem servidor).

```sh
pnpm install
pnpm dev      # servidor de desenvolvimento
pnpm test     # vitest (lógica pura: payloads, CSV, PIX, i18n, consentimento)
pnpm lint
pnpm build    # type-check + build
```

## Estrutura

- `src/lib/` — QR (`qr.ts`), payloads dos 12 tipos (`payloads.ts`), CSV, exportação, Recentes, consentimento.
- `src/i18n/` — `pt-BR.ts` (fonte) e `en.ts`. Um teste exige as mesmas chaves nos dois e que toda chave usada no código exista.
- `src/components/` e `src/components/ui/` — componentes do Figma (página Componentes).

## Idiomas

`t('chave.com.pontos', { n })` em qualquer componente. Para adicionar um idioma: crie o dicionário, registre em `src/i18n/index.ts` (`LOCALES` e `dicts`).

## Privacidade e `localStorage`

Nada é enviado a servidores. O app guarda no navegador:

| Chave | O que é | Quando |
|---|---|---|
| `creative-qr:consent` | a escolha de privacidade | sempre (necessário) |
| `creative-qr:lang` | idioma | sempre (necessário) |
| `creative-qr:recentes:v1` | QR codes recentes | só com permissão (Cookies) |

Sem permissão, Recentes vive só na memória da sessão. Há testes em `src/lib/consent.test.ts`.
