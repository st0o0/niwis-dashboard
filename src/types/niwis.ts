export type MessgroesseType = 'abfluss' | 'wasserstand' | 'grundwasserstand' | 'quellschuettung'

export type NiedrigwasserKlasse = 'keine' | 'niedrig' | 'sehr_niedrig' | 'extrem_niedrig'

export type TrendDirection = 'steigend' | 'fallend' | 'gleichbleibend'

export interface NiwisStation {
  messstelleNr: string
  name: string
  landcode: string
  lizenz: string
  messgroesse: string[]
  // Enriched from /stammdaten
  breite?: number
  laenge?: number
  gewaesser?: string
  betreiber?: string
  institution?: string
  ezgGroesse?: number | null
  hoehePnp?: number | null
}

export interface NiwisStammdaten {
  messstelleNr: string
  name: string
  landcode: string
  lizenz: string
  messgroesse: string[]
  institution: string
  betreiber: string
  urlInstitution: string | null
  urlBetreiber: string | null
  urlMessstelle: string | null
  hoehensystem: string | null
  bemerkung: string | null
  laenge: number
  breite: number
  gewaesser: string
  gkz: number | null
  lageGewaesser: string | null
  ezgGroesse: number | null
  hoehePnp: number | null
  nnw: number | null
  nnwDatum: string | null
  nnq: number | null
  nnqDatum: string | null
}

export interface NiwisMesswert {
  messstelleNr: string
  datum: string
  messwert: number
  einheit: string
  flag: string | null
}

export interface NiwisEinzelwertKategorie {
  einzelwert: string
  einheit: string | null
  hatZuvieleFehlwerte: boolean
  fehlermeldung: string | null
}

export interface NiwisEinzelwertNummer {
  einzelwert: number
  einheit: string | null
  hatZuvieleFehlwerte: boolean
  fehlermeldung: string | null
}

export interface NiwisZeitreihenReferenz {
  startDatum: string
  zeitreihenGranularitaet: string
  werte: number[]
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

export interface NiwisKlimaindikator {
  niedrigwassertageWinterhalbjahrProFlussgebiet: Record<string, number[]>
  niedrigwasserttageSommerhalbjahrProFlussgebiet: Record<string, number[]>
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

export const MESSGROESSE_API_MAP: Record<string, MessgroesseType> = {
  'Abfluss': 'abfluss',
  'Wasserstand': 'wasserstand',
  'Grundwasserstand': 'grundwasserstand',
  'Quellschüttung': 'quellschuettung',
}

export const LANDCODE_LABELS: Record<string, string> = {
  DEBB: 'Brandenburg',
  DEBE: 'Berlin',
  DEBW: 'Baden-Württemberg',
  DEBY: 'Bayern',
  DEHB: 'Bremen',
  DEHE: 'Hessen',
  DEMV: 'Mecklenburg-Vorpommern',
  DENI: 'Niedersachsen',
  DENW: 'Nordrhein-Westfalen',
  DERP: 'Rheinland-Pfalz',
  DESH: 'Schleswig-Holstein',
  DESN: 'Sachsen',
  DEST: 'Sachsen-Anhalt',
  DETH: 'Thüringen',
  DEXX: 'Bund',
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
