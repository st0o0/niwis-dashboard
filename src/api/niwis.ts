import { cachedFetch } from './cache'
import type {
  NiwisStation,
  NiwisStammdaten,
  NiwisMesswert,
  NiwisEinzelwertKategorie,
  NiwisEinzelwertNummer,
  NiwisAbgeleiteteGroesse,
  NiwisZeitreihenReferenz,
  NiwisKlimaindikator,
  MessgroesseType,
  ZeitreihenParams,
} from '../types/niwis'

const BASE_URL = import.meta.env.DEV
  ? '/api/daten'
  : `${import.meta.env.VITE_API_PROXY || 'https://niwis-online.de'}/api/daten`

const TTL = {
  stations: 24 * 60 * 60 * 1000,
  stammdaten: 24 * 60 * 60 * 1000,
  messwerte: 15 * 60 * 1000,
  abgeleitet: 60 * 60 * 1000,
  berechnungsvorschriften: 24 * 60 * 60 * 1000,
} as const

async function fetchJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
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

export function getClassification(
  messstelleNr: string,
  abgeleiteteGroesse: string,
): Promise<NiwisEinzelwertKategorie> {
  const params: Record<string, string> = {
    messstelleNr,
    abgeleiteteGroesse,
    startJahr: '1991',
    endJahr: '2020',
    jahresdefinition: 'KALENDERJAHR',
  }
  const cacheKey = `niwis:klassifikation:${messstelleNr}:${abgeleiteteGroesse}`
  return cachedFetch(cacheKey, TTL.abgeleitet, () =>
    fetchJson<NiwisEinzelwertKategorie>('/berechneEinzelwertKategorie', params),
  )
}

export function getTrend(
  messstelleNr: string,
  abgeleiteteGroesse: string,
): Promise<NiwisEinzelwertKategorie> {
  const cacheKey = `niwis:trend:${messstelleNr}:${abgeleiteteGroesse}`
  return cachedFetch(cacheKey, TTL.messwerte, () =>
    fetchJson<NiwisEinzelwertKategorie>('/berechneEinzelwertKategorie', {
      messstelleNr,
      abgeleiteteGroesse,
    }),
  )
}

export function getReferenceValue(
  messstelleNr: string,
  abgeleiteteGroesse: string,
): Promise<NiwisEinzelwertNummer> {
  const params: Record<string, string> = {
    messstelleNr,
    abgeleiteteGroesse,
    startJahr: '1991',
    endJahr: '2020',
    jahresdefinition: 'KALENDERJAHR',
  }
  const cacheKey = `niwis:refval:${messstelleNr}:${abgeleiteteGroesse}`
  return cachedFetch(cacheKey, TTL.stammdaten, () =>
    fetchJson<NiwisEinzelwertNummer>('/berechneEinzelwertNummer', params),
  )
}

export function getReferenceSeries(
  messstelleNr: string,
  abgeleiteteGroesse: string,
): Promise<NiwisZeitreihenReferenz> {
  const params: Record<string, string> = {
    messstelleNr,
    abgeleiteteGroesse,
    startJahr: '1991',
    endJahr: '2020',
    jahresdefinition: 'KALENDERJAHR',
  }
  const cacheKey = `niwis:refseries:${messstelleNr}:${abgeleiteteGroesse}`
  return cachedFetch(cacheKey, TTL.stammdaten, () =>
    fetchJson<NiwisZeitreihenReferenz>('/berechneZeitreihenErgebnisNummer', params),
  )
}

export function getKlimaindikator(): Promise<NiwisKlimaindikator> {
  return cachedFetch('niwis:klimaindikator', TTL.abgeleitet, () =>
    fetchJson<NiwisKlimaindikator>('/berechneKlimaindikatorNiedrigwassertage', {
      messstelleNr: 'DESM_DEBY16607001',
    }),
  )
}
