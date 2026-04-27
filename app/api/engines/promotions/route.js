import { runPromotionsEngine } from '@/lib/engines/promotions'

export async function GET() {
  const data = await runPromotionsEngine()
  return Response.json(data)
}
