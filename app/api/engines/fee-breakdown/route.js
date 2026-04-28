import { runFeeBreakdownEngine } from '@/lib/engines/feeBreakdown'
export async function GET() {
  const data = await runFeeBreakdownEngine()
  return Response.json(data)
}
