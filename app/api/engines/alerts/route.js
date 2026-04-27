import { runAlertsEngine } from '@/lib/engines/alerts'

export async function GET() {
  const data = await runAlertsEngine()
  return Response.json(data)
}
