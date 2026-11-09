<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import HomeView from './views/HomeView.vue'
import InformationView from './views/InformationView.vue'
import TopBar from './components/TopBar.vue'
import SiteFooter from './components/SiteFooter.vue'
import ConsentBanner from './components/ConsentBanner.vue'
import PreferencesModal from './components/PreferencesModal.vue'
import TutorialTour from './components/TutorialTour.vue'
import { useTutorial } from './composables/useTutorial'
import { decided, preferencesOpen } from './lib/consent'

function currentPage(): 'generator' | 'about' | 'faq' {
  if (['#/sobre', '#sobre'].includes(location.hash)) return 'about'
  if (['#/faq', '#faq'].includes(location.hash)) return 'faq'
  return 'generator'
}
const page = ref(currentPage())
const tutorial = useTutorial(
  computed(() => page.value === 'generator' && decided.value && !preferencesOpen.value),
)
async function onNavigation() {
  page.value = currentPage()
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'instant' })
  document
    .getElementById(page.value === 'generator' ? 'generator-page' : 'information-page')
    ?.focus({ preventScroll: true })
}
function startTutorial() {
  if (page.value !== 'generator') location.hash = '#/'
  tutorial.start()
}
onMounted(() => window.addEventListener('hashchange', onNavigation))
onBeforeUnmount(() => window.removeEventListener('hashchange', onNavigation))
</script>

<template>
  <TopBar :page="page" @tutorial="startTutorial" />
  <!-- Preserva os dados do gerador ao consultar as páginas de ajuda. -->
  <div v-show="page === 'generator'">
    <HomeView />
  </div>
  <InformationView v-if="page !== 'generator'" :page="page" />
  <SiteFooter />
  <ConsentBanner />
  <PreferencesModal />
  <TutorialTour
    :open="tutorial.open.value"
    :step="tutorial.step.value"
    @next="tutorial.next"
    @previous="tutorial.previous"
    @close="tutorial.finish"
  />
</template>
