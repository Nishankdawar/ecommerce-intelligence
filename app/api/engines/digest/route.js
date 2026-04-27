import { runDigestEngine } from '@/lib/engines/digest'

export async function GET() {
  const data = await runDigestEngine()
  return Response.json(data)
}
