import { bustCache } from '@/lib/cache'
import { reprocessSettlement } from '@/lib/parsers'

export async function POST() {
  const cleared = bustCache()
  // Also delete pre-processed settlement JSONs so they get rebuilt fresh
  reprocessSettlement()
  return Response.json({ success: true, cache_entries_cleared: cleared })
}
