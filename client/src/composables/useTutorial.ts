import { onMounted, readonly, ref, watch, type Ref } from 'vue'

export const TUTORIAL_KEY = 'creative-qr:tutorial:v1'

export function useTutorial(ready: Ref<boolean>) {
  const open = ref(false)
  const step = ref(0)
  let seen = false
  let requested = false
  try {
    seen = localStorage.getItem(TUTORIAL_KEY) === 'seen'
  } catch {
    // Sem armazenamento: a conclusão fica apenas na memória desta sessão.
  }
  function start() {
    requested = true
    if (ready.value) {
      step.value = 0
      open.value = true
      requested = false
    }
  }
  function finish() {
    seen = true
    requested = false
    open.value = false
    try {
      localStorage.setItem(TUTORIAL_KEY, 'seen')
    } catch {
      // Mantém o estado em memória ao navegar entre as páginas.
    }
  }
  onMounted(() => {
    watch(
      ready,
      (value) => {
        if (value && (!seen || requested)) start()
        else if (!value && open.value) finish()
      },
      { immediate: true },
    )
  })
  function next() {
    if (step.value === 3) finish()
    else step.value++
  }
  function previous() {
    step.value = Math.max(0, step.value - 1)
  }
  return { open: readonly(open), step: readonly(step), start, finish, next, previous }
}
