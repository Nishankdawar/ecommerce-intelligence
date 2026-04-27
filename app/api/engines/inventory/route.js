import { runInventoryEngine } from '@/lib/engines/inventory'

export async function GET() {
  const data = await runInventoryEngine()
  return Response.json(data)
}
