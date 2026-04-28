import { runSettlementEngine } from '@/lib/engines/settlement'
export async function GET() {
  const data = await runSettlementEngine()
  return Response.json(data)
}
