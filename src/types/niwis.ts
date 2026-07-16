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
