import { runListingQualityEngine } from '@/lib/engines/listingQuality'

export async function GET() {
  const data = await runListingQualityEngine()
  return Response.json(data)
}
