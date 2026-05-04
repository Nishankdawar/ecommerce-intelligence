/**
 * SP-API Authentication
 * Manages LWA (Login with Amazon) access token refresh.
 * Refresh token never expires. Access token valid for 1 hour.
 */

let cachedToken = null

export async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }

  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.LWA_CLIENT_ID,
      client_secret: process.env.LWA_CLIENT_SECRET,
      refresh_token: process.env.LWA_REFRESH_TOKEN,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LWA token refresh failed: ${res.status} ${err}`)
  }

  const { access_token, expires_in } = await res.json()

  cachedToken = {
    value: access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000, // expire 60s early for safety
  }

  return access_token
}
