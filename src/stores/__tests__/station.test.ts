import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/niwis', () => ({
  getStations: vi.fn(),
  getStammdaten: vi.fn(),
}))

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
}))

import { useStationStore } from '../station'
import { getStations } from '../../api/niwis'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useStationStore', () => {
  it('starts empty with loading false', () => {
    const store = useStationStore()
    expect(store.stations).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('fetches and stores stations', async () => {
    const mockStations = [
      { messstelleNr: 'S1', name: 'Station 1', landcode: 'DEBY', lizenz: 'cc-by/4.0', messgroesse: ['Abfluss'], breite: 48.1, laenge: 11.5 },
      { messstelleNr: 'S2', name: 'Station 2', landcode: 'DENW', lizenz: 'cc-by/4.0', messgroesse: ['Wasserstand'], breite: 51.2, laenge: 7.1 },
    ]
    ;(getStations as ReturnType<typeof vi.fn>).mockResolvedValue(mockStations)

    const store = useStationStore()
    await store.fetchStations()

    expect(store.stations).toEqual(mockStations)
    expect(store.loading).toBe(false)
  })

  it('finds station by nr', async () => {
    ;(getStations as ReturnType<typeof vi.fn>).mockResolvedValue([
      { messstelleNr: 'S1', name: 'Station 1' },
    ])
    const store = useStationStore()
    await store.fetchStations()
    expect(store.getStationByNr('S1')?.name).toBe('Station 1')
    expect(store.getStationByNr('NOPE')).toBeUndefined()
  })

  it('sets error on fetch failure', async () => {
    ;(getStations as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network'))
    const store = useStationStore()
    await store.fetchStations()
    expect(store.error).toBe('Network')
    expect(store.stations).toEqual([])
  })
})
