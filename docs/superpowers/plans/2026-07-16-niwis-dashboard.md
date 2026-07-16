# NIWIS Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vue 3 SPA that consumes the public NIWIS API to visualize Germany's low-water data with interactive maps, timeseries charts, station comparison, and personal watchlists.

**Architecture:** Pure frontend SPA — no backend. The Vue app calls the NIWIS REST API directly (`https://www.niwis-online.de/api/daten`). State lives in Pinia stores backed by IndexedDB caching (TTL-based) and localStorage (watchlist). Leaflet renders the map, Apache ECharts renders timeseries.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Vite, TailwindCSS v4, Pinia, Vue Router, Leaflet + @vue-leaflet/vue-leaflet, Apache ECharts + vue-echarts, idb-keyval, Vitest

## Global Constraints

- Vue 3 with `<script setup lang="ts">` exclusively — no Options API
- TypeScript strict mode
- TailwindCSS v4 for all styling — no custom CSS files except Leaflet overrides
- All API response types must be verified against real NIWIS API responses on first run — the `/messstelle` and `/stammdaten` field shapes are inferred (API docs don't list fields)
- Niedrigwasser classification colors: `#22c55e` (none), `#eab308` (low), `#f97316` (very low), `#ef4444` (extreme)
- ISO-8601 dates (`YYYY-MM-DD`) for all API date parameters
- Project root: `D:\GIT\niwis-dashboard`

---

### Task 1: Project Scaffold + TypeScript Types + API Client + Cache

**Files:**
- Create: `package.json` (via `npm create vite@latest`)
- Create: `vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.app.json`
- Create: `src/types/niwis.ts`
- Create: `src/api/niwis.ts`
- Create: `src/api/cache.ts`
- Create: `src/api/__tests__/niwis.test.ts`
- Create: `src/api/__tests__/cache.test.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `NiwisStation` — `{ messstelleNr: string; name: string; gewaesser: string; betreiber: string; breite: number; laenge: number; messgroessen: string[]; bundesland: string }`
  - `NiwisStammdaten` — `{ messstelleNr: string; name: string; gewaesser: string; betreiber: string; breite: number; laenge: number; pegelnullpunkt?: number; einzugsgebietsgroesse?: number; bundesland: string }`
  - `NiwisMesswert` — `{ messstelleNr: string; datum: string; messwert: number; einheit: string; flag: string | null }`
  - `NiwisAbgeleiteteGroesse` — `{ abgeleiteteGroesse: string; messgroesse: string; benoetigtReferenzzeitraum: boolean; benoetigtZeitintervall: boolean; endpunkt: string }`
  - `MessgroesseType` — `'abfluss' | 'wasserstand' | 'grundwasserstand' | 'quellschuettung'`
  - `NiwisApi` — object with methods: `getStations(): Promise<NiwisStation[]>`, `getStammdaten(nr: string): Promise<NiwisStammdaten>`, `getMesswerte(type: MessgroesseType, nr: string, von: string, bis: string): Promise<NiwisMesswert[]>`, `getAbgeleiteteGroessen(): Promise<NiwisAbgeleiteteGroesse[]>`, `berechneZeitreihe(params): Promise<any[]>`, `berechneKlassifikation(params): Promise<any>`
  - `CachedFetch` — `(key: string, ttlMs: number, fetcher: () => Promise<T>) => Promise<T>`

- [ ] **Step 1: Scaffold Vite + Vue 3 project**

```bash
cd D:\GIT\niwis-dashboard
npm create vite@latest . -- --template vue-ts
```

When prompted, confirm overwriting the existing directory (it only has the `docs/` folder).

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install pinia vue-router@4 @vue-leaflet/vue-leaflet leaflet vue-echarts echarts idb-keyval
npm install -D @types/leaflet vitest @vue/test-utils happy-dom @tailwindcss/vite tailwindcss
```

- [ ] **Step 3: Configure Vite with TailwindCSS**

Replace `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
```

Replace `src/style.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Configure Vitest in tsconfig**

Add to `tsconfig.app.json` under `compilerOptions`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

- [ ] **Step 5: Write TypeScript types**

Create `src/types/niwis.ts`:

```ts
export type MessgroesseType = 'abfluss' | 'wasserstand' | 'grundwasserstand' | 'quellschuettung'

export type NiedrigwasserKlasse = 'keine' | 'niedrig' | 'sehr_niedrig' | 'extrem_niedrig'

export interface NiwisStation {
  messstelleNr: string
  name: string
  gewaesser: string
  betreiber: string
  breite: number
  laenge: number
  messgroessen: string[]
  bundesland: string
}

export interface NiwisStammdaten {
  messstelleNr: string
  name: string
  gewaesser: string
  betreiber: string
  breite: number
  laenge: number
  pegelnullpunkt?: number
  einzugsgebietsgroesse?: number
  bundesland: string
}

export interface NiwisMesswert {
  messstelleNr: string
  datum: string
  messwert: number
  einheit: string
  flag: string | null
}

export interface NiwisAbgeleiteteGroesse {
  abgeleiteteGroesse: string
  messgroesse: string
  benoetigtReferenzzeitraum: boolean
  benoetigtZeitintervall: boolean
  endpunkt: string
}

export interface NiwisZeitreihenErgebnis {
  messstelleNr: string
  datum: string
  ergebnis: number
  hatZuvieleFehlwerte: boolean
  fehlermeldung: string | null
}

export interface NiwisKlassifikation {
  messstelleNr: string
  klasse: string
  grenzwerte: Record<string, number>
  hatZuvieleFehlwerte: boolean
  fehlermeldung: string | null
}

export interface ZeitreihenParams {
  abgeleiteteGroesse: string
  messstelleNr: string
  jahresdefinition?: 'HYDROLOGISCHESJAHR' | 'WASSERHAUSHALTSJAHR' | 'KALENDERJAHR'
  startJahr?: number
  endJahr?: number
  von?: string
  bis?: string
}

export const CLASSIFICATION_COLORS: Record<NiedrigwasserKlasse, string> = {
  keine: '#22c55e',
  niedrig: '#eab308',
  sehr_niedrig: '#f97316',
  extrem_niedrig: '#ef4444',
}

export const CLASSIFICATION_LABELS: Record<NiedrigwasserKlasse, string> = {
  keine: 'Kein Niedrigwasser',
  niedrig: 'Niedrigwasser',
  sehr_niedrig: 'Sehr niedriges Niedrigwasser',
  extrem_niedrig: 'Extrem niedriges Niedrigwasser',
}

export const MESSGROESSE_LABELS: Record<MessgroesseType, string> = {
  abfluss: 'Abfluss',
  wasserstand: 'Wasserstand',
  grundwasserstand: 'Grundwasserstand',
  quellschuettung: 'Quellschüttung',
}
```

- [ ] **Step 6: Write the cache layer**

Create `src/api/cache.ts`:

```ts
import { get, set } from 'idb-keyval'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = await get<CacheEntry<T>>(key)
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data
  }
  const data = await fetcher()
  await set(key, { data, timestamp: Date.now() })
  return data
}

export async function invalidateCache(key: string): Promise<void> {
  const { del } = await import('idb-keyval')
  await del(key)
}
```

- [ ] **Step 7: Write the cache test**

Create `src/api/__tests__/cache.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('idb-keyval', () => {
  const store = new Map()
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    del: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
  }
})

import { cachedFetch, invalidateCache } from '../cache'
import { get, set } from 'idb-keyval'

beforeEach(() => {
  vi.clearAllMocks()
  ;(get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
})

describe('cachedFetch', () => {
  it('calls fetcher when cache is empty', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3])
    const result = await cachedFetch('test-key', 60_000, fetcher)
    expect(result).toEqual([1, 2, 3])
    expect(fetcher).toHaveBeenCalledOnce()
    expect(set).toHaveBeenCalledWith('test-key', {
      data: [1, 2, 3],
      timestamp: expect.any(Number),
    })
  })

  it('returns cached data when within TTL', async () => {
    ;(get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [4, 5, 6],
      timestamp: Date.now() - 30_000,
    })
    const fetcher = vi.fn()
    const result = await cachedFetch('test-key', 60_000, fetcher)
    expect(result).toEqual([4, 5, 6])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('refetches when TTL expired', async () => {
    ;(get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [4, 5, 6],
      timestamp: Date.now() - 120_000,
    })
    const fetcher = vi.fn().mockResolvedValue([7, 8, 9])
    const result = await cachedFetch('test-key', 60_000, fetcher)
    expect(result).toEqual([7, 8, 9])
    expect(fetcher).toHaveBeenCalledOnce()
  })
})

describe('invalidateCache', () => {
  it('deletes the cache entry', async () => {
    const { del } = await import('idb-keyval')
    await invalidateCache('test-key')
    expect(del).toHaveBeenCalledWith('test-key')
  })
})
```

- [ ] **Step 8: Run cache tests**

```bash
npx vitest run src/api/__tests__/cache.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 9: Write the API client**

Create `src/api/niwis.ts`:

```ts
import { cachedFetch } from './cache'
import type {
  NiwisStation,
  NiwisStammdaten,
  NiwisMesswert,
  NiwisAbgeleiteteGroesse,
  MessgroesseType,
  ZeitreihenParams,
} from '../types/niwis'

const BASE_URL = 'https://www.niwis-online.de/api/daten'

const TTL = {
  stations: 24 * 60 * 60 * 1000,
  stammdaten: 24 * 60 * 60 * 1000,
  messwerte: 15 * 60 * 1000,
  abgeleitet: 60 * 60 * 1000,
  berechnungsvorschriften: 24 * 60 * 60 * 1000,
} as const

async function fetchJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`NIWIS API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export function getStations(): Promise<NiwisStation[]> {
  return cachedFetch('niwis:messstellen', TTL.stations, () =>
    fetchJson<NiwisStation[]>('/messstelle'),
  )
}

export function getStammdaten(messstelleNr: string): Promise<NiwisStammdaten> {
  return cachedFetch(`niwis:stammdaten:${messstelleNr}`, TTL.stammdaten, () =>
    fetchJson<NiwisStammdaten>('/stammdaten', { messstelleNr }),
  )
}

export function getMesswerte(
  type: MessgroesseType,
  messstelleNr: string,
  von: string,
  bis: string,
): Promise<NiwisMesswert[]> {
  const cacheKey = `niwis:${type}:${messstelleNr}:${von}:${bis}`
  return cachedFetch(cacheKey, TTL.messwerte, () =>
    fetchJson<NiwisMesswert[]>(`/${type}`, { messstelleNr, von, bis }),
  )
}

export function getAbgeleiteteGroessen(): Promise<NiwisAbgeleiteteGroesse[]> {
  return cachedFetch('niwis:abgeleiteteGroessen', TTL.berechnungsvorschriften, () =>
    fetchJson<NiwisAbgeleiteteGroesse[]>('/abgeleiteteGroesse'),
  )
}

export function berechneZeitreihe(params: ZeitreihenParams, endpunkt: string): Promise<unknown[]> {
  const queryParams: Record<string, string> = {
    abgeleiteteGroesse: params.abgeleiteteGroesse,
    messstelleNr: params.messstelleNr,
  }
  if (params.jahresdefinition) queryParams.jahresdefinition = params.jahresdefinition
  if (params.startJahr !== undefined) queryParams.startJahr = String(params.startJahr)
  if (params.endJahr !== undefined) queryParams.endJahr = String(params.endJahr)
  if (params.von) queryParams.von = params.von
  if (params.bis) queryParams.bis = params.bis

  const cacheKey = `niwis:berechne:${endpunkt}:${JSON.stringify(queryParams)}`
  return cachedFetch(cacheKey, TTL.abgeleitet, () =>
    fetchJson<unknown[]>(`/${endpunkt}`, queryParams),
  )
}

export function berechneKlassifikation(
  messstelleNr: string,
  abgeleiteteGroesse: string,
  startJahr?: number,
  endJahr?: number,
  jahresdefinition?: string,
): Promise<unknown> {
  const queryParams: Record<string, string> = {
    abgeleiteteGroesse,
    messstelleNr,
  }
  if (startJahr !== undefined) queryParams.startJahr = String(startJahr)
  if (endJahr !== undefined) queryParams.endJahr = String(endJahr)
  if (jahresdefinition) queryParams.jahresdefinition = jahresdefinition

  const cacheKey = `niwis:klassifikation:${JSON.stringify(queryParams)}`
  return cachedFetch(cacheKey, TTL.abgeleitet, () =>
    fetchJson<unknown>('/berechneKlassifikationsgrenzeDynamisch', queryParams),
  )
}

export function berechneKlimaindikator(): Promise<unknown> {
  return cachedFetch('niwis:klimaindikator', TTL.abgeleitet, () =>
    fetchJson<unknown>('/berechneKlimaindikatorNiedrigwassertage'),
  )
}
```

- [ ] **Step 10: Write the API client test**

Create `src/api/__tests__/niwis.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../cache', () => ({
  cachedFetch: vi.fn((_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { getStations, getStammdaten, getMesswerte, getAbgeleiteteGroessen } from '../niwis'

beforeEach(() => {
  vi.clearAllMocks()
})

function mockOkResponse(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

describe('getStations', () => {
  it('fetches from /messstelle', async () => {
    const stations = [{ messstelleNr: 'S1', name: 'Station 1' }]
    mockOkResponse(stations)
    const result = await getStations()
    expect(result).toEqual(stations)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/messstelle'),
    )
  })
})

describe('getStammdaten', () => {
  it('fetches with messstelleNr param', async () => {
    const stamm = { messstelleNr: 'S1', name: 'Station 1' }
    mockOkResponse(stamm)
    const result = await getStammdaten('S1')
    expect(result).toEqual(stamm)
    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('/stammdaten')
    expect(calledUrl).toContain('messstelleNr=S1')
  })
})

describe('getMesswerte', () => {
  it('fetches abfluss with date range', async () => {
    const messwerte = [
      { messstelleNr: 'S1', datum: '2024-01-31', messwert: 0.039, einheit: 'm³/s', flag: null },
    ]
    mockOkResponse(messwerte)
    const result = await getMesswerte('abfluss', 'S1', '2024-01-01', '2024-01-31')
    expect(result).toEqual(messwerte)
    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('/abfluss')
    expect(calledUrl).toContain('messstelleNr=S1')
    expect(calledUrl).toContain('von=2024-01-01')
    expect(calledUrl).toContain('bis=2024-01-31')
  })
})

describe('getAbgeleiteteGroessen', () => {
  it('fetches derived metric definitions', async () => {
    const groessen = [
      {
        abgeleiteteGroesse: 'Dezile tageweise',
        messgroesse: 'ABFLUSS',
        benoetigtReferenzzeitraum: true,
        benoetigtZeitintervall: false,
        endpunkt: 'berechneKlassifikationsgrenzeDynamisch',
      },
    ]
    mockOkResponse(groessen)
    const result = await getAbgeleiteteGroessen()
    expect(result).toEqual(groessen)
  })
})

describe('error handling', () => {
  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })
    await expect(getStations()).rejects.toThrow('NIWIS API error: 500')
  })
})
```

- [ ] **Step 11: Run API client tests**

```bash
npx vitest run src/api/__tests__/niwis.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 12: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts on `http://localhost:5173`, shows default Vue page.

- [ ] **Step 13: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold project with types, API client, and cache layer"
```

---

### Task 2: Pinia Stores

**Files:**
- Create: `src/stores/station.ts`
- Create: `src/stores/measurement.ts`
- Create: `src/stores/classification.ts`
- Create: `src/stores/watchlist.ts`
- Create: `src/stores/__tests__/station.test.ts`
- Create: `src/stores/__tests__/watchlist.test.ts`
- Modify: `src/main.ts` — add Pinia

**Interfaces:**
- Consumes: `NiwisStation`, `NiwisStammdaten`, `NiwisMesswert`, `MessgroesseType` from `src/types/niwis.ts`; `getStations`, `getStammdaten`, `getMesswerte`, `berechneKlassifikation` from `src/api/niwis.ts`
- Produces:
  - `useStationStore()` — `{ stations: NiwisStation[], loading: boolean, error: string | null, fetchStations(): Promise<void>, getStationByNr(nr: string): NiwisStation | undefined, stationsByBundesland: Map<string, NiwisStation[]> }`
  - `useMeasurementStore()` — `{ messwerte: NiwisMesswert[], loading: boolean, fetchMesswerte(type, nr, von, bis): Promise<void>, clearMesswerte(): void }`
  - `useClassificationStore()` — `{ classifications: Map<string, NiedrigwasserKlasse>, loading: boolean, fetchClassification(nr: string): Promise<void>, getKlasse(nr: string): NiedrigwasserKlasse }`
  - `useWatchlistStore()` — `{ watchlist: string[], isWatched(nr: string): boolean, toggle(nr: string): void, remove(nr: string): void }`

- [ ] **Step 1: Write the watchlist store test**

Create `src/stores/__tests__/watchlist.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWatchlistStore } from '../watchlist'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useWatchlistStore', () => {
  it('starts with empty watchlist', () => {
    const store = useWatchlistStore()
    expect(store.watchlist).toEqual([])
  })

  it('toggles station in watchlist', () => {
    const store = useWatchlistStore()
    store.toggle('S1')
    expect(store.isWatched('S1')).toBe(true)
    store.toggle('S1')
    expect(store.isWatched('S1')).toBe(false)
  })

  it('removes station from watchlist', () => {
    const store = useWatchlistStore()
    store.toggle('S1')
    store.toggle('S2')
    store.remove('S1')
    expect(store.watchlist).toEqual(['S2'])
  })

  it('persists to localStorage', () => {
    const store = useWatchlistStore()
    store.toggle('S1')
    expect(JSON.parse(localStorage.getItem('niwis-watchlist')!)).toEqual(['S1'])
  })

  it('restores from localStorage', () => {
    localStorage.setItem('niwis-watchlist', JSON.stringify(['S1', 'S2']))
    const store = useWatchlistStore()
    expect(store.watchlist).toEqual(['S1', 'S2'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/stores/__tests__/watchlist.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement watchlist store**

Create `src/stores/watchlist.ts`:

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'niwis-watchlist'

export const useWatchlistStore = defineStore('watchlist', () => {
  const watchlist = ref<string[]>(loadFromStorage())

  function loadFromStorage(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist.value))
  }

  function isWatched(messstelleNr: string): boolean {
    return watchlist.value.includes(messstelleNr)
  }

  function toggle(messstelleNr: string) {
    if (isWatched(messstelleNr)) {
      watchlist.value = watchlist.value.filter((nr) => nr !== messstelleNr)
    } else {
      watchlist.value = [...watchlist.value, messstelleNr]
    }
    persist()
  }

  function remove(messstelleNr: string) {
    watchlist.value = watchlist.value.filter((nr) => nr !== messstelleNr)
    persist()
  }

  return { watchlist, isWatched, toggle, remove }
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/stores/__tests__/watchlist.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Write station store test**

Create `src/stores/__tests__/station.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../api/niwis', () => ({
  getStations: vi.fn(),
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
      { messstelleNr: 'S1', name: 'Station 1', bundesland: 'Bayern', breite: 48.1, laenge: 11.5 },
      { messstelleNr: 'S2', name: 'Station 2', bundesland: 'NRW', breite: 51.2, laenge: 7.1 },
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
```

- [ ] **Step 6: Implement station store**

Create `src/stores/station.ts`:

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStations } from '../api/niwis'
import type { NiwisStation } from '../types/niwis'

export const useStationStore = defineStore('station', () => {
  const stations = ref<NiwisStation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStations() {
    loading.value = true
    error.value = null
    try {
      stations.value = await getStations()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      stations.value = []
    } finally {
      loading.value = false
    }
  }

  function getStationByNr(nr: string): NiwisStation | undefined {
    return stations.value.find((s) => s.messstelleNr === nr)
  }

  const stationsByBundesland = computed(() => {
    const map = new Map<string, NiwisStation[]>()
    for (const s of stations.value) {
      const list = map.get(s.bundesland) ?? []
      list.push(s)
      map.set(s.bundesland, list)
    }
    return map
  })

  return { stations, loading, error, fetchStations, getStationByNr, stationsByBundesland }
})
```

- [ ] **Step 7: Run station store test**

```bash
npx vitest run src/stores/__tests__/station.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 8: Implement measurement store**

Create `src/stores/measurement.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMesswerte } from '../api/niwis'
import type { NiwisMesswert, MessgroesseType } from '../types/niwis'

export const useMeasurementStore = defineStore('measurement', () => {
  const messwerte = ref<NiwisMesswert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMesswerte(
    type: MessgroesseType,
    messstelleNr: string,
    von: string,
    bis: string,
  ) {
    loading.value = true
    error.value = null
    try {
      messwerte.value = await getMesswerte(type, messstelleNr, von, bis)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function clearMesswerte() {
    messwerte.value = []
  }

  return { messwerte, loading, error, fetchMesswerte, clearMesswerte }
})
```

- [ ] **Step 9: Implement classification store**

Create `src/stores/classification.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NiedrigwasserKlasse } from '../types/niwis'

export const useClassificationStore = defineStore('classification', () => {
  const classifications = ref(new Map<string, NiedrigwasserKlasse>())
  const loading = ref(false)

  function setKlasse(messstelleNr: string, klasse: NiedrigwasserKlasse) {
    classifications.value = new Map(classifications.value.set(messstelleNr, klasse))
  }

  function getKlasse(messstelleNr: string): NiedrigwasserKlasse {
    return classifications.value.get(messstelleNr) ?? 'keine'
  }

  return { classifications, loading, setKlasse, getKlasse }
})
```

- [ ] **Step 10: Register Pinia in main.ts**

Replace `src/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 11: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (cache + API + stores).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add Pinia stores for stations, measurements, classification, watchlist"
```

---

### Task 3: App Shell + Router + Sidebar + Theme

**Files:**
- Create: `src/router/index.ts`
- Create: `src/views/DashboardView.vue`
- Create: `src/views/MapView.vue`
- Create: `src/views/StationView.vue`
- Create: `src/views/CompareView.vue`
- Create: `src/components/layout/AppSidebar.vue`
- Create: `src/components/layout/ThemeToggle.vue`
- Modify: `src/App.vue`
- Modify: `src/main.ts` — add router

**Interfaces:**
- Consumes: `useWatchlistStore()` from `src/stores/watchlist.ts`, `useStationStore()` from `src/stores/station.ts`
- Produces:
  - `AppSidebar.vue` — sidebar component with nav links, watchlist section, theme toggle
  - `ThemeToggle.vue` — dark/light toggle, persists preference to localStorage
  - Router with routes: `/`, `/karte`, `/station/:id`, `/vergleich`

- [ ] **Step 1: Create router**

Create `src/router/index.ts`:

```ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
    { path: '/karte', name: 'karte', component: () => import('../views/MapView.vue') },
    { path: '/station/:id', name: 'station', component: () => import('../views/StationView.vue') },
    { path: '/vergleich', name: 'vergleich', component: () => import('../views/CompareView.vue') },
  ],
})

export default router
```

- [ ] **Step 2: Create placeholder views**

Create `src/views/DashboardView.vue`:

```vue
<script setup lang="ts">
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">Dashboard</h1>
    <p class="text-gray-500 dark:text-gray-400 mt-2">Übersicht kommt in Task 7.</p>
  </div>
</template>
```

Create `src/views/MapView.vue`:

```vue
<script setup lang="ts">
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">Karte</h1>
    <p class="text-gray-500 dark:text-gray-400 mt-2">Karte kommt in Task 8.</p>
  </div>
</template>
```

Create `src/views/StationView.vue`:

```vue
<script setup lang="ts">
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">Station</h1>
    <p class="text-gray-500 dark:text-gray-400 mt-2">Stationsdetail kommt in Task 9.</p>
  </div>
</template>
```

Create `src/views/CompareView.vue`:

```vue
<script setup lang="ts">
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">Vergleich</h1>
    <p class="text-gray-500 dark:text-gray-400 mt-2">Vergleich kommt in Task 10.</p>
  </div>
</template>
```

- [ ] **Step 3: Create ThemeToggle**

Create `src/components/layout/ThemeToggle.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)

onMounted(() => {
  isDark.value = localStorage.getItem('niwis-theme') === 'dark'
    || (!localStorage.getItem('niwis-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  applyTheme()
})

function toggle() {
  isDark.value = !isDark.value
  localStorage.setItem('niwis-theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}
</script>

<template>
  <button
    @click="toggle"
    class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    :title="isDark ? 'Light Mode' : 'Dark Mode'"
  >
    <svg v-if="isDark" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
    </svg>
    <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
    </svg>
  </button>
</template>
```

- [ ] **Step 4: Create AppSidebar**

Create `src/components/layout/AppSidebar.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useWatchlistStore } from '../../stores/watchlist'
import { useStationStore } from '../../stores/station'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()
const watchlistStore = useWatchlistStore()
const stationStore = useStationStore()
const collapsed = ref(false)
const watchlistOpen = ref(true)

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { to: '/karte', label: 'Karte', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/vergleich', label: 'Vergleich', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

function isActive(to: string): boolean {
  return route.path === to
}
</script>

<template>
  <aside
    class="h-screen flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <span v-if="!collapsed" class="text-lg font-bold text-blue-600 dark:text-blue-400">NIWIS</span>
      <button
        @click="collapsed = !collapsed"
        class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>

    <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
        :class="isActive(item.to)
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
        </svg>
        <span v-if="!collapsed">{{ item.label }}</span>
      </RouterLink>

      <div v-if="!collapsed && watchlistStore.watchlist.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="watchlistOpen = !watchlistOpen"
          class="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 w-full"
        >
          <svg class="w-4 h-4 transition-transform" :class="watchlistOpen ? 'rotate-90' : ''" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 6L14 10L6 14V6Z"/>
          </svg>
          Watchlist
        </button>
        <div v-if="watchlistOpen" class="mt-1 space-y-1">
          <RouterLink
            v-for="nr in watchlistStore.watchlist"
            :key="nr"
            :to="`/station/${nr}`"
            class="block px-3 py-1.5 text-sm rounded-lg truncate text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {{ stationStore.getStationByNr(nr)?.name ?? nr }}
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-center">
      <ThemeToggle />
    </div>
  </aside>
</template>
```

- [ ] **Step 5: Wire up App.vue**

Replace `src/App.vue`:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useStationStore } from './stores/station'
import AppSidebar from './components/layout/AppSidebar.vue'

const stationStore = useStationStore()

onMounted(() => {
  stationStore.fetchStations()
})
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-6">
      <RouterView />
    </main>
  </div>
</template>
```

- [ ] **Step 6: Add router to main.ts**

Replace `src/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
- Sidebar shows with NIWIS logo, 3 nav links
- Sidebar collapses/expands
- Theme toggle switches dark/light
- Clicking nav links shows placeholder content
- Router URLs work (`/karte`, `/vergleich`)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add app shell with sidebar, router, and theme toggle"
```

---

### Task 4: Map Components

**Files:**
- Create: `src/components/map/StationMap.vue`
- Create: `src/components/map/StationPopup.vue`
- Create: `src/components/shared/WatchlistToggle.vue`

**Interfaces:**
- Consumes: `NiwisStation`, `NiedrigwasserKlasse`, `CLASSIFICATION_COLORS` from `src/types/niwis.ts`; `useClassificationStore()`, `useWatchlistStore()`
- Produces:
  - `StationMap.vue` — Props: `{ stations: NiwisStation[], height?: string }`, emits `station-click(nr: string)`
  - `StationPopup.vue` — Props: `{ station: NiwisStation }`
  - `WatchlistToggle.vue` — Props: `{ messstelleNr: string }`

- [ ] **Step 1: Create WatchlistToggle**

Create `src/components/shared/WatchlistToggle.vue`:

```vue
<script setup lang="ts">
import { useWatchlistStore } from '../../stores/watchlist'

const props = defineProps<{ messstelleNr: string }>()
const watchlistStore = useWatchlistStore()
</script>

<template>
  <button
    @click.stop="watchlistStore.toggle(props.messstelleNr)"
    class="p-1 hover:scale-110 transition-transform"
    :title="watchlistStore.isWatched(props.messstelleNr) ? 'Von Watchlist entfernen' : 'Zur Watchlist hinzufügen'"
  >
    <svg class="w-5 h-5" :class="watchlistStore.isWatched(props.messstelleNr) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
    </svg>
  </button>
</template>
```

- [ ] **Step 2: Create StationPopup**

Create `src/components/map/StationPopup.vue`:

```vue
<script setup lang="ts">
import type { NiwisStation } from '../../types/niwis'
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '../../types/niwis'
import { useClassificationStore } from '../../stores/classification'

const props = defineProps<{ station: NiwisStation }>()
const classificationStore = useClassificationStore()

const klasse = classificationStore.getKlasse(props.station.messstelleNr)
</script>

<template>
  <div class="min-w-[200px]">
    <div class="font-bold text-sm">{{ station.name }}</div>
    <div class="text-xs text-gray-500 mt-0.5">{{ station.gewaesser }}</div>
    <div class="flex items-center gap-1.5 mt-2">
      <span
        class="inline-block w-3 h-3 rounded-full"
        :style="{ backgroundColor: CLASSIFICATION_COLORS[klasse] }"
      />
      <span class="text-xs">{{ CLASSIFICATION_LABELS[klasse] }}</span>
    </div>
    <RouterLink
      :to="`/station/${station.messstelleNr}`"
      class="inline-block mt-2 text-xs text-blue-600 hover:underline"
    >
      Details anzeigen
    </RouterLink>
  </div>
</template>
```

- [ ] **Step 3: Create StationMap**

Create `src/components/map/StationMap.vue`:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  LMap,
  LTileLayer,
  LCircleMarker,
  LPopup,
  LLayerGroup,
  LControlLayers,
} from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import type { NiwisStation } from '../../types/niwis'
import { CLASSIFICATION_COLORS } from '../../types/niwis'
import { useClassificationStore } from '../../stores/classification'
import StationPopup from './StationPopup.vue'

const props = withDefaults(defineProps<{
  stations: NiwisStation[]
  height?: string
  interactive?: boolean
}>(), {
  height: '100%',
  interactive: true,
})

const emit = defineEmits<{
  'station-click': [messstelleNr: string]
}>()

const classificationStore = useClassificationStore()

const center = ref<[number, number]>([51.1657, 10.4515])
const zoom = ref(6)

function markerColor(station: NiwisStation): string {
  const klasse = classificationStore.getKlasse(station.messstelleNr)
  return CLASSIFICATION_COLORS[klasse]
}

function onMarkerClick(station: NiwisStation) {
  emit('station-click', station.messstelleNr)
}
</script>

<template>
  <div :style="{ height }">
    <LMap
      :zoom="zoom"
      :center="center"
      :use-global-leaflet="false"
      class="w-full h-full rounded-lg z-0"
    >
      <LControlLayers v-if="interactive" />
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        layer-type="base"
        name="OpenStreetMap"
      />
      <LTileLayer
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenTopoMap"
        layer-type="base"
        name="Topografisch"
        :visible="false"
      />
      <LCircleMarker
        v-for="station in stations"
        :key="station.messstelleNr"
        :lat-lng="[station.breite, station.laenge]"
        :radius="7"
        :color="markerColor(station)"
        :fill-color="markerColor(station)"
        :fill-opacity="0.8"
        :weight="2"
        @click="onMarkerClick(station)"
      >
        <LPopup v-if="interactive">
          <StationPopup :station="station" />
        </LPopup>
      </LCircleMarker>
    </LMap>
  </div>
</template>
```

- [ ] **Step 4: Verify map renders**

```bash
npm run dev
```

Temporarily add to `DashboardView.vue` to test:

```vue
<script setup lang="ts">
import { useStationStore } from '../stores/station'
import StationMap from '../components/map/StationMap.vue'
const stationStore = useStationStore()
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
    <StationMap :stations="stationStore.stations" height="500px" />
  </div>
</template>
```

Open browser — if the NIWIS API returns data, you should see markers on a Germany-centered map. If CORS blocks the API, you'll see an empty map (address CORS in the vite proxy config if needed).

- [ ] **Step 5: Add Vite proxy for CORS (if needed)**

If the NIWIS API doesn't send CORS headers, add to `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api/daten': {
        target: 'https://www.niwis-online.de',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
```

And update `BASE_URL` in `src/api/niwis.ts`:

```ts
const BASE_URL = import.meta.env.DEV
  ? '/api/daten'
  : 'https://www.niwis-online.de/api/daten'
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add map components with Leaflet, station markers, and popups"
```

---

### Task 5: Chart Components

**Files:**
- Create: `src/components/charts/TimeseriesChart.vue`
- Create: `src/components/charts/SparklineChart.vue`
- Create: `src/components/charts/ClassificationGauge.vue`
- Create: `src/components/shared/DateRangePicker.vue`

**Interfaces:**
- Consumes: `NiwisMesswert`, `NiedrigwasserKlasse`, `CLASSIFICATION_COLORS`, `CLASSIFICATION_LABELS` from `src/types/niwis.ts`
- Produces:
  - `TimeseriesChart.vue` — Props: `{ data: NiwisMesswert[], title?: string, einheit?: string, height?: string }`, emits `date-range-select({ von: string, bis: string })`
  - `SparklineChart.vue` — Props: `{ data: NiwisMesswert[], color?: string, height?: string }`
  - `ClassificationGauge.vue` — Props: `{ klasse: NiedrigwasserKlasse }`
  - `DateRangePicker.vue` — Props: `{ von: string, bis: string }`, emits `update:von(string)`, `update:bis(string)`, `preset(days: number)`

- [ ] **Step 1: Create DateRangePicker**

Create `src/components/shared/DateRangePicker.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{ von: string; bis: string }>()
const emit = defineEmits<{
  'update:von': [value: string]
  'update:bis': [value: string]
  preset: [days: number]
}>()

const presets = [
  { label: '7T', days: 7 },
  { label: '30T', days: 30 },
  { label: '90T', days: 90 },
  { label: '1J', days: 365 },
]
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button
      v-for="p in presets"
      :key="p.days"
      @click="emit('preset', p.days)"
      class="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {{ p.label }}
    </button>
    <div class="flex items-center gap-1 ml-2">
      <input
        type="date"
        :value="props.von"
        @input="emit('update:von', ($event.target as HTMLInputElement).value)"
        class="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      />
      <span class="text-gray-400">–</span>
      <input
        type="date"
        :value="props.bis"
        @input="emit('update:bis', ($event.target as HTMLInputElement).value)"
        class="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create ClassificationGauge**

Create `src/components/charts/ClassificationGauge.vue`:

```vue
<script setup lang="ts">
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS, type NiedrigwasserKlasse } from '../../types/niwis'

const props = defineProps<{ klasse: NiedrigwasserKlasse }>()
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="inline-block w-3 h-3 rounded-full shrink-0"
      :style="{ backgroundColor: CLASSIFICATION_COLORS[props.klasse] }"
    />
    <span class="text-sm font-medium">{{ CLASSIFICATION_LABELS[props.klasse] }}</span>
  </div>
</template>
```

- [ ] **Step 3: Create SparklineChart**

Create `src/components/charts/SparklineChart.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { NiwisMesswert } from '../../types/niwis'

use([LineChart, GridComponent, CanvasRenderer])

const props = withDefaults(defineProps<{
  data: NiwisMesswert[]
  color?: string
  height?: string
}>(), {
  color: '#3b82f6',
  height: '40px',
})

const option = computed(() => {
  const sorted = [...props.data].sort((a, b) => a.datum.localeCompare(b.datum))
  return {
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: 'category', show: false, data: sorted.map((d) => d.datum) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line',
      data: sorted.map((d) => d.messwert),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: props.color, width: 1.5 },
      areaStyle: { color: props.color, opacity: 0.1 },
    }],
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height }" autoresize />
</template>
```

- [ ] **Step 4: Create TimeseriesChart**

Create `src/components/charts/TimeseriesChart.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { NiwisMesswert } from '../../types/niwis'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, ToolboxComponent, LegendComponent, CanvasRenderer])

const props = withDefaults(defineProps<{
  data: NiwisMesswert[]
  title?: string
  einheit?: string
  height?: string
}>(), {
  height: '400px',
})

const option = computed(() => {
  const sorted = [...props.data].sort((a, b) => a.datum.localeCompare(b.datum))
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.name}<br/>${p.value} ${props.einheit ?? ''}`
      },
    },
    toolbox: {
      feature: {
        dataZoom: { yAxisIndex: 'none' },
        restore: {},
        saveAsImage: {},
      },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 },
    ],
    xAxis: {
      type: 'category',
      data: sorted.map((d) => d.datum),
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: props.einheit,
    },
    series: [{
      name: props.title ?? 'Messwert',
      type: 'line',
      data: sorted.map((d) => d.messwert),
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 1.5 },
      areaStyle: { opacity: 0.05 },
    }],
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height }" autoresize />
</template>
```

- [ ] **Step 5: Verify charts render**

Temporarily test in `DashboardView.vue` with mock data:

```vue
<script setup lang="ts">
import SparklineChart from '../components/charts/SparklineChart.vue'
const mockData = Array.from({ length: 30 }, (_, i) => ({
  messstelleNr: 'S1', datum: `2024-01-${String(i + 1).padStart(2, '0')}`,
  messwert: Math.random() * 10, einheit: 'm³/s', flag: null,
}))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
    <SparklineChart :data="mockData" height="60px" />
  </div>
</template>
```

Open browser — should see a mini sparkline chart.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add chart components (timeseries, sparkline, gauge) and date range picker"
```

---

### Task 6: Shared Components (Search + Export)

**Files:**
- Create: `src/components/shared/StationSearch.vue`
- Create: `src/components/shared/ExportButton.vue`

**Interfaces:**
- Consumes: `useStationStore()` from `src/stores/station.ts`
- Produces:
  - `StationSearch.vue` — Props: `{ placeholder?: string }`, emits `select(messstelleNr: string)`
  - `ExportButton.vue` — Props: `{ data: NiwisMesswert[], filename?: string }`

- [ ] **Step 1: Create StationSearch**

Create `src/components/shared/StationSearch.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStationStore } from '../../stores/station'

withDefaults(defineProps<{ placeholder?: string }>(), {
  placeholder: 'Station suchen...',
})
const emit = defineEmits<{ select: [messstelleNr: string] }>()

const stationStore = useStationStore()
const query = ref('')
const isFocused = ref(false)

const results = computed(() => {
  if (query.value.length < 2) return []
  const q = query.value.toLowerCase()
  return stationStore.stations
    .filter((s) => s.name.toLowerCase().includes(q) || s.gewaesser.toLowerCase().includes(q))
    .slice(0, 10)
})

function selectStation(nr: string) {
  query.value = ''
  isFocused.value = false
  emit('select', nr)
}
</script>

<template>
  <div class="relative">
    <input
      v-model="query"
      :placeholder="placeholder"
      @focus="isFocused = true"
      @blur="setTimeout(() => isFocused = false, 200)"
      class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <div
      v-if="isFocused && results.length > 0"
      class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      <button
        v-for="station in results"
        :key="station.messstelleNr"
        @mousedown.prevent="selectStation(station.messstelleNr)"
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
      >
        <div class="font-medium">{{ station.name }}</div>
        <div class="text-xs text-gray-500">{{ station.gewaesser }} · {{ station.bundesland }}</div>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create ExportButton**

Create `src/components/shared/ExportButton.vue`:

```vue
<script setup lang="ts">
import type { NiwisMesswert } from '../../types/niwis'

const props = withDefaults(defineProps<{
  data: NiwisMesswert[]
  filename?: string
}>(), {
  filename: 'niwis-export',
})

function exportCsv() {
  if (props.data.length === 0) return
  const header = 'Messstelle;Datum;Messwert;Einheit;Flag'
  const rows = props.data.map((d) =>
    `${d.messstelleNr};${d.datum};${d.messwert};${d.einheit};${d.flag ?? ''}`,
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <button
    @click="exportCsv"
    :disabled="data.length === 0"
    class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
    CSV Export
  </button>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add station search autocomplete and CSV export button"
```

---

### Task 7: Dashboard View

**Files:**
- Modify: `src/views/DashboardView.vue` — full implementation
- Create: `src/components/dashboard/StatusTile.vue`
- Create: `src/components/dashboard/WatchlistCard.vue`

**Interfaces:**
- Consumes: `useStationStore()`, `useClassificationStore()`, `useWatchlistStore()`, `StationMap.vue`, `SparklineChart.vue`, `ClassificationGauge.vue`, `WatchlistToggle.vue`
- Produces: complete Dashboard page

- [ ] **Step 1: Create StatusTile**

Create `src/components/dashboard/StatusTile.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  label: string
  count: number
  color: string
  total: number
}>()
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-2xl font-bold">{{ count }}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ label }}</div>
      </div>
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
        :style="{ backgroundColor: color }"
      >
        {{ total > 0 ? Math.round(count / total * 100) : 0 }}%
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create WatchlistCard**

Create `src/components/dashboard/WatchlistCard.vue`:

```vue
<script setup lang="ts">
import type { NiwisStation, NiwisMesswert } from '../../types/niwis'
import { useClassificationStore } from '../../stores/classification'
import SparklineChart from '../charts/SparklineChart.vue'
import ClassificationGauge from '../charts/ClassificationGauge.vue'
import WatchlistToggle from '../shared/WatchlistToggle.vue'
import { CLASSIFICATION_COLORS } from '../../types/niwis'

const props = defineProps<{
  station: NiwisStation
  recentData: NiwisMesswert[]
}>()

const classificationStore = useClassificationStore()
const klasse = classificationStore.getKlasse(props.station.messstelleNr)
const latestValue = props.recentData.length > 0
  ? props.recentData.reduce((a, b) => a.datum > b.datum ? a : b)
  : null
</script>

<template>
  <RouterLink
    :to="`/station/${station.messstelleNr}`"
    class="block bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-start justify-between">
      <div>
        <div class="font-semibold text-sm">{{ station.name }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ station.gewaesser }}</div>
      </div>
      <WatchlistToggle :messstelle-nr="station.messstelleNr" />
    </div>
    <div v-if="latestValue" class="mt-2 text-lg font-bold">
      {{ latestValue.messwert }} <span class="text-sm font-normal text-gray-500">{{ latestValue.einheit }}</span>
    </div>
    <SparklineChart
      v-if="recentData.length > 0"
      :data="recentData"
      :color="CLASSIFICATION_COLORS[klasse]"
      height="40px"
      class="mt-2"
    />
    <ClassificationGauge :klasse="klasse" class="mt-2" />
  </RouterLink>
</template>
```

- [ ] **Step 3: Implement DashboardView**

Replace `src/views/DashboardView.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStationStore } from '../stores/station'
import { useClassificationStore } from '../stores/classification'
import { useWatchlistStore } from '../stores/watchlist'
import { getMesswerte } from '../api/niwis'
import type { NiwisMesswert, NiedrigwasserKlasse } from '../types/niwis'
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '../types/niwis'
import StationMap from '../components/map/StationMap.vue'
import StatusTile from '../components/dashboard/StatusTile.vue'
import WatchlistCard from '../components/dashboard/WatchlistCard.vue'

const stationStore = useStationStore()
const classificationStore = useClassificationStore()
const watchlistStore = useWatchlistStore()

const watchlistData = ref(new Map<string, NiwisMesswert[]>())

const klassenCounts = computed(() => {
  const counts: Record<NiedrigwasserKlasse, number> = {
    keine: 0, niedrig: 0, sehr_niedrig: 0, extrem_niedrig: 0,
  }
  for (const s of stationStore.stations) {
    const k = classificationStore.getKlasse(s.messstelleNr)
    counts[k]++
  }
  return counts
})

const tiles = computed(() => [
  { label: CLASSIFICATION_LABELS.keine, count: klassenCounts.value.keine, color: CLASSIFICATION_COLORS.keine },
  { label: CLASSIFICATION_LABELS.niedrig, count: klassenCounts.value.niedrig, color: CLASSIFICATION_COLORS.niedrig },
  { label: CLASSIFICATION_LABELS.sehr_niedrig, count: klassenCounts.value.sehr_niedrig, color: CLASSIFICATION_COLORS.sehr_niedrig },
  { label: CLASSIFICATION_LABELS.extrem_niedrig, count: klassenCounts.value.extrem_niedrig, color: CLASSIFICATION_COLORS.extrem_niedrig },
])

const watchedStations = computed(() =>
  watchlistStore.watchlist
    .map((nr) => stationStore.getStationByNr(nr))
    .filter((s) => s !== undefined),
)

onMounted(async () => {
  const bis = new Date().toISOString().slice(0, 10)
  const von = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  for (const nr of watchlistStore.watchlist) {
    try {
      const data = await getMesswerte('abfluss', nr, von, bis)
      watchlistData.value.set(nr, data)
    } catch {
      // station may not have abfluss data
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Dashboard</h1>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatusTile
        v-for="tile in tiles"
        :key="tile.label"
        :label="tile.label"
        :count="tile.count"
        :color="tile.color"
        :total="stationStore.stations.length"
      />
    </div>

    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <StationMap :stations="stationStore.stations" height="400px" />
    </div>

    <div v-if="watchedStations.length > 0">
      <h2 class="text-lg font-semibold mb-3">Watchlist</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WatchlistCard
          v-for="station in watchedStations"
          :key="station.messstelleNr"
          :station="station"
          :recent-data="watchlistData.get(station.messstelleNr) ?? []"
        />
      </div>
    </div>

    <div v-if="stationStore.loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Verify dashboard in browser**

```bash
npm run dev
```

Open `http://localhost:5173` — should see status tiles (all "keine" initially since we don't have classification data yet), the map, and watchlist section (empty until stations are favorited).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement dashboard view with status tiles, map, and watchlist cards"
```

---

### Task 8: Map View

**Files:**
- Modify: `src/views/MapView.vue` — full implementation

**Interfaces:**
- Consumes: `useStationStore()`, `useClassificationStore()`, `StationMap.vue`, `MESSGROESSE_LABELS`, `NiedrigwasserKlasse`, `CLASSIFICATION_LABELS`
- Produces: full-screen filterable map page

- [ ] **Step 1: Implement MapView**

Replace `src/views/MapView.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStationStore } from '../stores/station'
import { useClassificationStore } from '../stores/classification'
import StationMap from '../components/map/StationMap.vue'
import type { MessgroesseType, NiedrigwasserKlasse } from '../types/niwis'
import { MESSGROESSE_LABELS, CLASSIFICATION_LABELS, CLASSIFICATION_COLORS } from '../types/niwis'

const router = useRouter()
const stationStore = useStationStore()
const classificationStore = useClassificationStore()

const filterMessgroesse = ref<MessgroesseType | ''>('')
const filterBundesland = ref('')
const filterKlasse = ref<NiedrigwasserKlasse | ''>('')

const bundeslaender = computed(() => {
  const set = new Set(stationStore.stations.map((s) => s.bundesland))
  return [...set].sort()
})

const filteredStations = computed(() => {
  return stationStore.stations.filter((s) => {
    if (filterBundesland.value && s.bundesland !== filterBundesland.value) return false
    if (filterMessgroesse.value && !s.messgroessen?.includes(filterMessgroesse.value.toUpperCase())) return false
    if (filterKlasse.value && classificationStore.getKlasse(s.messstelleNr) !== filterKlasse.value) return false
    return true
  })
})

function onStationClick(nr: string) {
  router.push(`/station/${nr}`)
}

function clearFilters() {
  filterMessgroesse.value = ''
  filterBundesland.value = ''
  filterKlasse.value = ''
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-3rem)]">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Karte</h1>
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ filteredStations.length }} / {{ stationStore.stations.length }} Stationen
      </span>
    </div>

    <div class="flex flex-wrap gap-3 mb-4">
      <select
        v-model="filterMessgroesse"
        class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option value="">Alle Messgrößen</option>
        <option v-for="(label, key) in MESSGROESSE_LABELS" :key="key" :value="key">
          {{ label }}
        </option>
      </select>

      <select
        v-model="filterBundesland"
        class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option value="">Alle Bundesländer</option>
        <option v-for="bl in bundeslaender" :key="bl" :value="bl">{{ bl }}</option>
      </select>

      <select
        v-model="filterKlasse"
        class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option value="">Alle Klassen</option>
        <option v-for="(label, key) in CLASSIFICATION_LABELS" :key="key" :value="key">
          {{ label }}
        </option>
      </select>

      <button
        v-if="filterMessgroesse || filterBundesland || filterKlasse"
        @click="clearFilters"
        class="px-3 py-1.5 text-sm text-red-500 hover:text-red-700"
      >
        Filter zurücksetzen
      </button>
    </div>

    <div class="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <StationMap
        :stations="filteredStations"
        height="100%"
        @station-click="onStationClick"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `/karte`. Verify:
- Map fills the viewport
- Filter dropdowns populate with real data
- Filters reduce visible markers
- Clicking a marker popup link navigates to `/station/:id`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement map view with filters for messgroesse, bundesland, and classification"
```

---

### Task 9: Station Detail View

**Files:**
- Modify: `src/views/StationView.vue` — full implementation

**Interfaces:**
- Consumes: `useStationStore()`, `useMeasurementStore()`, `useClassificationStore()`, `getStammdaten()` from API, `TimeseriesChart.vue`, `DateRangePicker.vue`, `ClassificationGauge.vue`, `WatchlistToggle.vue`, `ExportButton.vue`
- Produces: complete station detail page

- [ ] **Step 1: Implement StationView**

Replace `src/views/StationView.vue`:

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStationStore } from '../stores/station'
import { useClassificationStore } from '../stores/classification'
import { getStammdaten, getMesswerte } from '../api/niwis'
import type { NiwisStammdaten, NiwisMesswert, MessgroesseType } from '../types/niwis'
import { MESSGROESSE_LABELS } from '../types/niwis'
import TimeseriesChart from '../components/charts/TimeseriesChart.vue'
import ClassificationGauge from '../components/charts/ClassificationGauge.vue'
import DateRangePicker from '../components/shared/DateRangePicker.vue'
import WatchlistToggle from '../components/shared/WatchlistToggle.vue'
import ExportButton from '../components/shared/ExportButton.vue'

const route = useRoute()
const stationStore = useStationStore()
const classificationStore = useClassificationStore()

const messstelleNr = computed(() => route.params.id as string)
const station = computed(() => stationStore.getStationByNr(messstelleNr.value))
const stammdaten = ref<NiwisStammdaten | null>(null)
const messwerte = ref<NiwisMesswert[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const activeTab = ref<MessgroesseType>('abfluss')
const bis = ref(new Date().toISOString().slice(0, 10))
const von = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))

const availableTabs = computed<MessgroesseType[]>(() => {
  if (!station.value?.messgroessen) return ['abfluss']
  const map: Record<string, MessgroesseType> = {
    ABFLUSS: 'abfluss',
    WASSERSTAND: 'wasserstand',
    GRUNDWASSER: 'grundwasserstand',
    QUELLSCHUETTUNG: 'quellschuettung',
  }
  return station.value.messgroessen
    .map((m) => map[m])
    .filter((m): m is MessgroesseType => m !== undefined)
})

const einheit = computed(() => {
  if (messwerte.value.length > 0) return messwerte.value[0].einheit
  return ''
})

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [stammResult, messResult] = await Promise.all([
      getStammdaten(messstelleNr.value),
      getMesswerte(activeTab.value, messstelleNr.value, von.value, bis.value),
    ])
    stammdaten.value = stammResult
    messwerte.value = messResult
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function onPreset(days: number) {
  bis.value = new Date().toISOString().slice(0, 10)
  von.value = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

watch([messstelleNr, activeTab, von, bis], loadData)
onMounted(loadData)
</script>

<template>
  <div v-if="station" class="space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">{{ station.name }}</h1>
          <WatchlistToggle :messstelle-nr="station.messstelleNr" />
        </div>
        <div class="text-gray-500 dark:text-gray-400 mt-1">
          {{ station.gewaesser }} · {{ station.betreiber }} · {{ station.bundesland }}
        </div>
        <div class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          {{ station.breite?.toFixed(4) }}°N, {{ station.laenge?.toFixed(4) }}°E
        </div>
      </div>
      <ClassificationGauge :klasse="classificationStore.getKlasse(station.messstelleNr)" />
    </div>

    <div v-if="availableTabs.length > 1" class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      <button
        v-for="tab in availableTabs"
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
      >
        {{ MESSGROESSE_LABELS[tab] }}
      </button>
    </div>

    <div class="flex items-center justify-between flex-wrap gap-4">
      <DateRangePicker
        :von="von"
        :bis="bis"
        @update:von="von = $event"
        @update:bis="bis = $event"
        @preset="onPreset"
      />
      <ExportButton :data="messwerte" :filename="`niwis-${station.name}-${activeTab}`" />
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
      {{ error }}
    </div>

    <div v-else-if="messwerte.length > 0" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <TimeseriesChart
        :data="messwerte"
        :title="MESSGROESSE_LABELS[activeTab]"
        :einheit="einheit"
        height="450px"
      />
    </div>

    <div v-else class="text-center py-12 text-gray-500 dark:text-gray-400">
      Keine Messwerte für den gewählten Zeitraum.
    </div>

    <div v-if="stammdaten" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h2 class="font-semibold mb-3">Stammdaten</h2>
      <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt class="text-gray-500 dark:text-gray-400">Messstelle Nr.</dt>
        <dd>{{ stammdaten.messstelleNr }}</dd>
        <dt class="text-gray-500 dark:text-gray-400">Gewässer</dt>
        <dd>{{ stammdaten.gewaesser }}</dd>
        <dt class="text-gray-500 dark:text-gray-400">Betreiber</dt>
        <dd>{{ stammdaten.betreiber }}</dd>
        <template v-if="stammdaten.pegelnullpunkt">
          <dt class="text-gray-500 dark:text-gray-400">Pegelnullpunkt</dt>
          <dd>{{ stammdaten.pegelnullpunkt }} m ü. NHN</dd>
        </template>
        <template v-if="stammdaten.einzugsgebietsgroesse">
          <dt class="text-gray-500 dark:text-gray-400">Einzugsgebiet</dt>
          <dd>{{ stammdaten.einzugsgebietsgroesse }} km²</dd>
        </template>
      </dl>
    </div>
  </div>

  <div v-else class="flex justify-center py-12">
    <p class="text-gray-500 dark:text-gray-400">Station nicht gefunden.</p>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `/station/<any-real-messstelleNr>`. Verify:
- Header shows station name, gewässer, coordinates
- Tabs switch between measurement types
- Date range picker changes chart data
- Timeseries chart renders with zoom/brush
- CSV export downloads file
- Watchlist star toggles

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement station detail view with timeseries chart, tabs, and stammdaten"
```

---

### Task 10: Compare View

**Files:**
- Modify: `src/views/CompareView.vue` — full implementation

**Interfaces:**
- Consumes: `useStationStore()`, `getMesswerte()`, `StationSearch.vue`, `DateRangePicker.vue`, `ExportButton.vue`, `TimeseriesChart.vue`
- Produces: complete comparison page with up to 4 stations

- [ ] **Step 1: Implement CompareView**

Replace `src/views/CompareView.vue`:

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStationStore } from '../stores/station'
import { getMesswerte } from '../api/niwis'
import type { NiwisMesswert, NiwisStation, MessgroesseType } from '../types/niwis'
import { MESSGROESSE_LABELS } from '../types/niwis'
import StationSearch from '../components/shared/StationSearch.vue'
import DateRangePicker from '../components/shared/DateRangePicker.vue'
import ExportButton from '../components/shared/ExportButton.vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, CanvasRenderer])

const stationStore = useStationStore()

const selectedNrs = ref<string[]>([])
const messgroesse = ref<MessgroesseType>('abfluss')
const bis = ref(new Date().toISOString().slice(0, 10))
const von = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
const loading = ref(false)

const seriesData = ref(new Map<string, NiwisMesswert[]>())

const selectedStations = computed(() =>
  selectedNrs.value
    .map((nr) => stationStore.getStationByNr(nr))
    .filter((s): s is NiwisStation => s !== undefined),
)

const allExportData = computed(() =>
  [...seriesData.value.values()].flat(),
)

const chartColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b']

const chartOption = computed(() => {
  const allDates = new Set<string>()
  for (const data of seriesData.value.values()) {
    for (const d of data) allDates.add(d.datum)
  }
  const dates = [...allDates].sort()

  const series = selectedNrs.value.map((nr, i) => {
    const data = seriesData.value.get(nr) ?? []
    const valueMap = new Map(data.map((d) => [d.datum, d.messwert]))
    const station = stationStore.getStationByNr(nr)
    return {
      name: station?.name ?? nr,
      type: 'line' as const,
      data: dates.map((d) => valueMap.get(d) ?? null),
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 1.5, color: chartColors[i] },
      itemStyle: { color: chartColors[i] },
    }
  })

  return {
    tooltip: { trigger: 'axis' },
    legend: { show: series.length > 1 },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 },
    ],
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series,
  }
})

async function fetchAll() {
  loading.value = true
  const newData = new Map<string, NiwisMesswert[]>()
  await Promise.all(
    selectedNrs.value.map(async (nr) => {
      try {
        const data = await getMesswerte(messgroesse.value, nr, von.value, bis.value)
        newData.set(nr, data)
      } catch {
        newData.set(nr, [])
      }
    }),
  )
  seriesData.value = newData
  loading.value = false
}

function addStation(nr: string) {
  if (selectedNrs.value.length >= 4 || selectedNrs.value.includes(nr)) return
  selectedNrs.value = [...selectedNrs.value, nr]
}

function removeStation(nr: string) {
  selectedNrs.value = selectedNrs.value.filter((n) => n !== nr)
  seriesData.value.delete(nr)
}

function onPreset(days: number) {
  bis.value = new Date().toISOString().slice(0, 10)
  von.value = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

watch([selectedNrs, messgroesse, von, bis], () => {
  if (selectedNrs.value.length > 0) fetchAll()
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Stationsvergleich</h1>

    <div class="flex flex-wrap gap-4 items-end">
      <div class="flex-1 min-w-[250px]">
        <label class="block text-sm font-medium mb-1">Station hinzufügen (max. 4)</label>
        <StationSearch
          :placeholder="selectedNrs.length >= 4 ? 'Maximum erreicht' : 'Station suchen...'"
          @select="addStation"
        />
      </div>
      <select
        v-model="messgroesse"
        class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option v-for="(label, key) in MESSGROESSE_LABELS" :key="key" :value="key">
          {{ label }}
        </option>
      </select>
    </div>

    <div v-if="selectedStations.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="(station, i) in selectedStations"
        :key="station.messstelleNr"
        class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm text-white"
        :style="{ backgroundColor: chartColors[i] }"
      >
        {{ station.name }}
        <button @click="removeStation(station.messstelleNr)" class="ml-1 hover:opacity-70">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="selectedNrs.length > 0" class="flex items-center justify-between flex-wrap gap-4">
      <DateRangePicker
        :von="von"
        :bis="bis"
        @update:von="von = $event"
        @update:bis="bis = $event"
        @preset="onPreset"
      />
      <ExportButton :data="allExportData" filename="niwis-vergleich" />
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="selectedNrs.length > 0 && seriesData.size > 0" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <VChart :option="chartOption" style="height: 450px" autoresize />
    </div>

    <div v-else-if="selectedNrs.length === 0" class="text-center py-16 text-gray-500 dark:text-gray-400">
      <p class="text-lg">Wähle bis zu 4 Stationen zum Vergleich aus.</p>
      <p class="text-sm mt-1">Nutze die Suche oben oder füge Stationen aus deiner Watchlist hinzu.</p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `/vergleich`. Verify:
- Station search finds and adds stations (colored chips)
- Removing a station chip works
- Chart shows overlaid lines for selected stations
- Date range picker and messgroesse dropdown change chart
- CSV export downloads all visible data
- Maximum 4 stations enforced

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement compare view with multi-station overlay chart and CSV export"
```

---

## Post-Implementation Verification

After all tasks are complete, run through this checklist in the browser:

1. **Dashboard:** Status tiles show, map renders with markers, watchlist cards appear for favorited stations
2. **Karte:** All 3 filters work, markers update, clicking popup navigates to station detail
3. **Station:** Chart renders with real data, tabs switch measurement types, date range changes data, CSV exports, watchlist star persists
4. **Vergleich:** Add/remove up to 4 stations, synchronized chart, CSV export
5. **Sidebar:** Collapses/expands, watchlist section shows favorited stations, theme toggle works
6. **Dark mode:** All views render correctly in both themes
7. **Router:** Direct URL access works for all routes including `/station/:id`
