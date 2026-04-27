import { runSkuHealthEngine } from '@/lib/engines/skuHealth'

export async function GET() {
  const data = await runSkuHealthEngine()
  return Response.json(data)
}
