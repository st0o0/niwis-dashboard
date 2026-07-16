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
