import { runRefundsEngine } from '@/lib/engines/refunds'
export async function GET() {
  const data = await runRefundsEngine()
  return Response.json(data)
}
