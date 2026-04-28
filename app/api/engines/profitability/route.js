import { runProfitabilityEngine } from '@/lib/engines/profitability'
export async function GET() {
  const data = await runProfitabilityEngine()
  return Response.json(data)
}
