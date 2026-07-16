import https from 'node:https'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API = 'https://niwis-online.de/api/daten'
const OUT = join(__dirname, '..', 'public', 'data')

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(API + path, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve(JSON.parse(d)) }
        catch { reject(new Error(`Parse error for ${path}: ${d.slice(0, 200)}`)) }
      })
    }).on('error', reject)
  })
}

async function batchFetch(items, fn, concurrency = 25) {
  const queue = [...items]
  const results = new Map()
  let done = 0
  const total = items.length

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()
      try {
        results.set(item, await fn(item))
      } catch { /* skip */ }
      done++
      if (done % 50 === 0) process.stdout.write(`  ${done}/${total}\r`)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  process.stdout.write(`  ${done}/${total}\n`)
  return results
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const start = Date.now()

  // 1. Stations
  console.log('Fetching stations...')
  const stations = await get('/messstelle')
  console.log(`  ${stations.length} stations`)

  // 2. Stammdaten
  console.log('Fetching stammdaten...')
  const stammMap = await batchFetch(
    stations.map(s => s.messstelleNr),
    nr => get('/stammdaten?messstelleNr=' + encodeURIComponent(nr)),
  )

  // Merge stammdaten into station objects
  const enriched = stations.map(s => {
    const st = stammMap.get(s.messstelleNr)
    if (st) {
      return {
        ...s,
        breite: st.breite,
        laenge: st.laenge,
        gewaesser: st.gewaesser,
        betreiber: st.betreiber,
        institution: st.institution,
        ezgGroesse: st.ezgGroesse,
        hoehePnp: st.hoehePnp,
      }
    }
    return s
  })
  writeFileSync(join(OUT, 'stations.json'), JSON.stringify(enriched))
  console.log(`  ${stammMap.size} enriched`)

  // 3. Classifications
  console.log('Fetching classifications...')
  const KLASS_MAP = {
    'Abfluss': 'Abfluss Niedrigwasserklasse aktueller Tag',
    'Grundwasserstand': 'Grundwasser Niedrigwasserklasse aktueller Tag',
    'Quellschüttung': 'Quellschüttung Niedrigwasserklasse aktueller Tag',
  }
  const klassMap = await batchFetch(
    stations.map(s => s.messstelleNr),
    async nr => {
      const station = stations.find(s => s.messstelleNr === nr)
      let ag = null
      for (const mg of station.messgroesse) {
        if (KLASS_MAP[mg]) { ag = KLASS_MAP[mg]; break }
      }
      if (!ag) return null
      const params = new URLSearchParams({
        messstelleNr: nr, abgeleiteteGroesse: ag,
        startJahr: '1991', endJahr: '2020', jahresdefinition: 'KALENDERJAHR',
      })
      return get('/berechneEinzelwertKategorie?' + params)
    },
    20,
  )
  const klassifikationen = {}
  for (const [nr, r] of klassMap) {
    if (r?.einzelwert) klassifikationen[nr] = r.einzelwert
  }
  writeFileSync(join(OUT, 'klassifikationen.json'), JSON.stringify(klassifikationen))
  console.log(`  ${Object.keys(klassifikationen).length} classified`)

  // 4. Trends
  console.log('Fetching trends...')
  const TREND_MAP = {
    'Abfluss': 'Abfluss Entwicklung letzte 7 Tage',
    'Wasserstand': 'Wasserstand Entwicklung letzte 7 Tage',
  }
  const trendMap = await batchFetch(
    stations.map(s => s.messstelleNr),
    async nr => {
      const station = stations.find(s => s.messstelleNr === nr)
      let ag = null
      for (const mg of station.messgroesse) {
        if (TREND_MAP[mg]) { ag = TREND_MAP[mg]; break }
      }
      if (!ag) return null
      const params = new URLSearchParams({ messstelleNr: nr, abgeleiteteGroesse: ag })
      return get('/berechneEinzelwertKategorie?' + params)
    },
    20,
  )
  const trends = {}
  for (const [nr, r] of trendMap) {
    if (r?.einzelwert && ['steigend', 'fallend', 'gleichbleibend'].includes(r.einzelwert)) {
      trends[nr] = r.einzelwert
    }
  }
  writeFileSync(join(OUT, 'trends.json'), JSON.stringify(trends))
  console.log(`  ${Object.keys(trends).length} trends`)

  // 5. Klimaindikator
  console.log('Fetching Klimaindikator...')
  const klima = await get('/berechneKlimaindikatorNiedrigwassertage?messstelleNr=DESM_DEBY16607001')
  writeFileSync(join(OUT, 'klimaindikator.json'), JSON.stringify(klima))
  console.log('  done')

  // 6. Write timestamp
  writeFileSync(join(OUT, 'meta.json'), JSON.stringify({ timestamp: new Date().toISOString() }))

  console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s`)
}

main().catch(e => { console.error(e); process.exit(1) })
