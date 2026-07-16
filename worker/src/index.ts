const API_ORIGIN = 'https://niwis-online.de'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const apiUrl = `${API_ORIGIN}${url.pathname}${url.search}`

    try {
      const response = await fetch(apiUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'niwis-dashboard/1.0',
        },
      })

      const newHeaders = new Headers(response.headers)
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        newHeaders.set(key, value)
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy error' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  },
}
