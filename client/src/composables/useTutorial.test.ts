import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ref, type App } from 'vue'
import { TUTORIAL_KEY, useTutorial } from './useTutorial'

// Exercita o ciclo de vida real do composable sem depender de um DOM simulado.
const renderer = createRenderer<object, object>({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  insert: () => {},
  remove: () => {},
  setText: () => {},
  setElementText: () => {},
  parentNode: () => null,
  nextSibling: () => null,
  patchProp: () => {},
})
let apps: App[] = []
let storage: Map<string, string>

function mount(initialReady: boolean) {
  const ready = ref(initialReady)
  let tutorial!: ReturnType<typeof useTutorial>
  const app = renderer.createApp({
    setup() {
      tutorial = useTutorial(ready)
      return () => null
    },
  })
  app.mount({})
  apps.push(app)
  return { tutorial, ready, app }
}

beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
})
afterEach(() => {
  apps.forEach((app) => app.unmount())
  apps = []
  vi.unstubAllGlobals()
})

describe('tutorial de primeira visita', () => {
  it('aguarda gerador e privacidade disponíveis antes de abrir', async () => {
    const { tutorial, ready } = mount(false)
    expect(tutorial.open.value).toBe(false)
    ready.value = true
    await nextTick()
    expect(tutorial.open.value).toBe(true)
  })
  it('pular ou fechar é lembrado ao recarregar', () => {
    const { tutorial } = mount(true)
    tutorial.finish()
    expect(storage.get(TUTORIAL_KEY)).toBe('seen')
    expect(mount(true).tutorial.open.value).toBe(false)
  })
  it('permite rever a partir do primeiro passo mesmo depois de concluído', () => {
    const { tutorial } = mount(true)
    for (let i = 0; i < 4; i++) tutorial.next()
    expect(tutorial.open.value).toBe(false)
    tutorial.start()
    expect(tutorial.open.value).toBe(true)
    expect(tutorial.step.value).toBe(0)
    tutorial.previous()
    expect(tutorial.step.value).toBe(0)
  })
  it('um pedido manual aguarda a privacidade sem se perder', async () => {
    storage.set(TUTORIAL_KEY, 'seen')
    const { tutorial, ready } = mount(false)
    tutorial.start()
    expect(tutorial.open.value).toBe(false)
    ready.value = true
    await nextTick()
    expect(tutorial.open.value).toBe(true)
  })
  it('sem armazenamento mantém conclusão em memória ao navegar', async () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
    })
    const { tutorial, ready } = mount(true)
    expect(() => tutorial.finish()).not.toThrow()
    ready.value = false
    await nextTick()
    ready.value = true
    await nextTick()
    expect(tutorial.open.value).toBe(false)
    tutorial.start()
    expect(tutorial.open.value).toBe(true)
  })
})
