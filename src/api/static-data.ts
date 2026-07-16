import type { NiwisStation, NiwisKlimaindikator } from '../types/niwis'

const BASE = import.meta.env.BASE_URL

async function loadJson<T>(filename: string): Promise<T> {
  const res = await fetch(`${BASE}data/${filename}`)
  if (!res.ok) throw new Error(`Failed to load ${filename}`)
  return res.json()
}

let stationsPromise: Promise<NiwisStation[]> | null = null
export function getStaticStations(): Promise<NiwisStation[]> {
  return stationsPromise ??= loadJson('stations.json')
}

let klassPromise: Promise<Record<string, string>> | null = null
export function getStaticKlassifikationen(): Promise<Record<string, string>> {
  return klassPromise ??= loadJson('klassifikationen.json')
}

let trendsPromise: Promise<Record<string, string>> | null = null
export function getStaticTrends(): Promise<Record<string, string>> {
  return trendsPromise ??= loadJson('trends.json')
}

let klimaPromise: Promise<NiwisKlimaindikator> | null = null
export function getStaticKlimaindikator(): Promise<NiwisKlimaindikator> {
  return klimaPromise ??= loadJson('klimaindikator.json')
}

let metaPromise: Promise<{ timestamp: string }> | null = null
export function getStaticMeta(): Promise<{ timestamp: string }> {
  return metaPromise ??= loadJson('meta.json')
}
