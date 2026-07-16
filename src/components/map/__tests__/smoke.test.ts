import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import StationMap from '../StationMap.vue'
import StationPopup from '../StationPopup.vue'
import WatchlistToggle from '../../shared/WatchlistToggle.vue'
import type { NiwisStation } from '../../../types/niwis'

const station: NiwisStation = {
  messstelleNr: '1234',
  name: 'Testpegel',
  gewaesser: 'Testfluss',
  betreiber: 'Test',
  breite: 51.1,
  laenge: 10.4,
  messgroessen: ['abfluss'],
  bundesland: 'Hessen',
}

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/station/:id', name: 'station', component: { template: '<div />' } }],
})

describe('map components smoke test', () => {
  it('mounts WatchlistToggle without error', () => {
    setActivePinia(createPinia())
    const wrapper = mount(WatchlistToggle, { props: { messstelleNr: '1234' } })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('mounts StationPopup without error', () => {
    setActivePinia(createPinia())
    const wrapper = mount(StationPopup, {
      props: { station },
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Testpegel')
  })

  it('mounts StationMap without error', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(StationMap, {
      props: { stations: [station] },
      global: { plugins: [router] },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
