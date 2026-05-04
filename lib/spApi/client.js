/**
 * SP-API HTTP client
 * Wraps fetch with auth token injection + error handling.
 */

import { getAccessToken } from './auth.js'

const BASE_URL = process.env.SP_API_ENDPOINT
const MARKETPLACE_ID = process.env.MARKETPLACE_ID

export async function spApiGet(path, params = {}) {
  const accessToken = await getAccessToken()

  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  const body = await res.json()

  if (!res.ok) {
    throw new Error(`SP-API ${path} failed: ${res.status} — ${JSON.stringify(body)}`)
  }

  return body
}

export { MARKETPLACE_ID }
