/**
 * /api/report-error — lightweight error telemetry receiver.
 *
 * Accepts POST requests from the ErrorBoundary via navigator.sendBeacon().
 * Logs the payload to the Vercel function log (visible in the Vercel dashboard
 * under Functions → Logs). No external service or API key required.
 *
 * The endpoint deliberately:
 *   - Ignores everything except POST (returns 405 otherwise)
 *   - Never returns a body (204 No Content)
 *   - Never throws — errors in error reporting are non-critical
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  try {
    let body = req.body
    if (typeof body === 'string') {
      body = JSON.parse(body)
    }
    // Emit to Vercel function log — visible at vercel.com/dashboard → Functions
    console.error('[ErrorBoundary:prod]', JSON.stringify({
      error: body?.error,
      stack: body?.stack,
      componentStack: body?.componentStack,
      url: body?.url,
      time: body?.time,
    }))
  } catch {
    // Parse or log failure — silently ignore, still return 204
  }

  res.status(204).end()
}
