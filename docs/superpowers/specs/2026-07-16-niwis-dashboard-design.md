# NIWIS Dashboard — Design Spec

## Zusammenfassung

Ein eigenes Frontend für das Niedrigwasser-Informationssystem (NIWIS) der BfG. Pure Frontend SPA mit Vue 3 + Vite, die direkt die öffentliche NIWIS API konsumiert. Bietet interaktive Karten, Zeitreihen-Analyse, Stationsvergleich und persönliche Watchlists.

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Sprache | TypeScript |
| Build | Vite |
| Styling | TailwindCSS |
| State | Pinia |
| Routing | Vue Router |
| Karten | Leaflet + vue-leaflet + OpenStreetMap Tiles |
| Charts | Apache ECharts + vue-echarts |
| Caching | IndexedDB via idb-keyval |
| Persistenz | localStorage (Watchlist, Settings) |

## Datenquelle

**NIWIS API** — `https://www.niwis-online.de/api/daten`

Öffentlich, keine Authentifizierung, JSON, kein bekanntes Rate-Limit.

### Endpoints

| Endpoint | Zweck |
|---|---|
| `GET /messstelle` | Alle Messstellen laden |
| `GET /stammdaten?messstelleNr=X` | Stammdaten einer Messstelle |
| `GET /abfluss?messstelleNr=X&von=Y&bis=Z` | Abfluss-Messwerte |
| `GET /wasserstand?messstelleNr=X&von=Y&bis=Z` | Wasserstand-Messwerte |
| `GET /grundwasserstand?messstelleNr=X&von=Y&bis=Z` | Grundwasserstand-Messwerte |
| `GET /quellschuettung?messstelleNr=X&von=Y&bis=Z` | Quellschüttung-Messwerte |
| `GET /abgeleiteteGroesse` | Berechnungsvorschriften |
| `GET /berechneKlassifikationsgrenzeDynamisch` | Niedrigwasser-Klassifikation |
| `GET /berechneZeitreihenErgebnisNummer` | Numerische Zeitreihen (abgeleitet) |
| `GET /berechneZeitreihenErgebnisZeichenfolge` | String-Zeitreihen (abgeleitet) |
| `GET /berechneEinzelwertNummer` | Einzelne numerische Werte |
| `GET /berechneEinzelwertKategorie` | Einzelne Kategorie-Werte |
| `GET /berechneKlassifikationsgrenzeStatisch` | Statische Klassifikationsgrenzen |
| `GET /berechneKlimaindikatorNiedrigwassertage` | Klimaindikator Niedrigwassertage |
| `GET /berechneLfi` | LFI-Berechnung |

### Caching-Strategie

| Daten | TTL |
|---|---|
| Messstellen-Liste | 24 Stunden |
| Stammdaten | 24 Stunden |
| Messwerte | 15 Minuten |
| Abgeleitete Größen | 1 Stunde |
| Berechnungsvorschriften | 24 Stunden |

## Architektur

```
NIWIS API
    │
    ▼
API-Service-Layer (api/niwis.ts)
    │
    ├── Caching-Layer (IndexedDB, TTL-basiert)
    │
    ▼
Pinia Stores
    ├── stationStore     — Messstellen + Stammdaten
    ├── measurementStore — aktive Messwerte + Zeitreihen
    ├── classificationStore — Niedrigwasser-Klassen + Grenzwerte
    └── watchlistStore   — User-Favoriten (localStorage)
    │
    ▼
Vue Components (Karte, Charts, Tabellen, Detail)
```

## Seiten

### 1. Dashboard (`/`)

Übersichtsseite mit drei Bereichen:

- **Status-Kacheln:** Anzahl Stationen pro Niedrigwasser-Klasse (keine / niedrig / sehr niedrig / extrem niedrig), farbcodiert grün/gelb/orange/rot
- **Übersichtskarte:** Alle Stationen als farbcodierte Marker, vereinfacht (kein Filter-Panel)
- **Watchlist-Cards:** Favorisierte Stationen als kompakte Cards mit Sparkline, aktuellem Wert und Klassifikation

### 2. Karte (`/karte`)

Vollbild-Kartenansicht:

- Interaktive Leaflet-Karte, auf Deutschland zentriert
- **Filter-Panel:** Messgrößen-Typ (Abfluss/Wasserstand/Grundwasser/Quellschüttung), Bundesland, Niedrigwasser-Klasse
- **Marker-Clustering** bei niedrigem Zoom-Level
- **Station-Popup** bei Klick: Name, aktueller Wert, Einheit, Klassifikation, Link zur Detailseite
- **Layer-Switching:** OpenStreetMap Standard / Topografisch

### 3. Station (`/station/:id`)

Detailansicht einer einzelnen Station:

- **Header:** Stationsname, Gewässer, Betreiber, Koordinaten, Klassifikations-Badge
- **Zeitreihen-Chart (ECharts):** Linienchart mit Zoom, Brush-Selection, optionale Referenzperiode als farbiges Band (Dezile)
- **Zeitraum-Picker:** Preset-Buttons (7/30/90/365 Tage) + Custom Date Range
- **Messgrößen-Tabs:** Wenn Station mehrere Messgrößen hat (z.B. Abfluss + Wasserstand)
- **Abgeleitete Größen:** Klassifikation, Dezile, Entwicklung der Niedrigwassersituation
- **Watchlist-Toggle:** Stern-Button zum Favorisieren

### 4. Vergleich (`/vergleich`)

Stationsvergleich:

- Bis zu 4 Stationen nebeneinander oder überlagert im selben Chart
- Stationen über Autocomplete-Suche oder aus Watchlist hinzufügen
- Synchronisierter Zeitraum über alle Charts
- **CSV-Export** der dargestellten Daten

## Navigation

Sidebar links, collapsible:

- Dashboard, Karte, Vergleich als Hauptpunkte
- Watchlist als aufklappbare Sektion mit Direktlinks zu Stationen
- Theme-Toggle (Dark/Light) und Info unten

## Komponenten

### Karten-Komponenten

| Komponente | Zweck |
|---|---|
| `StationMap.vue` | Leaflet-Karte mit Marker-Layer, übernimmt Filter aus Props |
| `StationMarker.vue` | Farbcodierter Circle-Marker nach Klassifikation |
| `StationPopup.vue` | Kompaktes Popup: Name, Wert, Einheit, Klasse, Link |

### Chart-Komponenten

| Komponente | Zweck |
|---|---|
| `TimeseriesChart.vue` | ECharts-Wrapper: Linie mit Zoom/Brush, Referenzbänder |
| `SparklineChart.vue` | Mini-Zeitreihe für Dashboard-Cards |
| `ClassificationGauge.vue` | Farbige Anzeige der Niedrigwasser-Klasse |

### Shared-Komponenten

| Komponente | Zweck |
|---|---|
| `StationSearch.vue` | Autocomplete über Stationsnamen und Gewässer |
| `DateRangePicker.vue` | Preset-Buttons + Custom Range |
| `ExportButton.vue` | CSV-Download der sichtbaren Daten |
| `WatchlistToggle.vue` | Stern-Button zum Favorisieren |

## Projektstruktur

```
D:\GIT\niwis-dashboard\
├── src/
│   ├── api/
│   │   └── niwis.ts
│   ├── composables/
│   │   ├── useStations.ts
│   │   ├── useMeasurements.ts
│   │   ├── useClassification.ts
│   │   └── useWatchlist.ts
│   ├── stores/
│   │   ├── station.ts
│   │   ├── measurement.ts
│   │   └── watchlist.ts
│   ├── components/
│   │   ├── map/
│   │   ├── charts/
│   │   └── shared/
│   ├── views/
│   │   ├── DashboardView.vue
│   │   ├── MapView.vue
│   │   ├── StationView.vue
│   │   └── CompareView.vue
│   ├── router/
│   │   └── index.ts
│   ├── types/
│   │   └── niwis.ts
│   └── App.vue
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Niedrigwasser-Klassifikation

Farbschema nach NIWIS-Standard:

| Klasse | Farbe | Bedeutung |
|---|---|---|
| Kein Niedrigwasser | `#22c55e` (grün) | Normal |
| Niedrigwasser | `#eab308` (gelb) | Unter Durchschnitt |
| Sehr niedriges Niedrigwasser | `#f97316` (orange) | Deutlich unter Durchschnitt |
| Extrem niedriges Niedrigwasser | `#ef4444` (rot) | Kritisch |

## Nicht im Scope (Phase 2)

- Push-Notifications / Alerts bei Schwellwerten
- Backend / Server-Komponente
- User-Accounts / Login
- Offline-Modus (Service Worker)
- Mobile App
