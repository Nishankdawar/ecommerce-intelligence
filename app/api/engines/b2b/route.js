import { runB2BEngine } from '@/lib/engines/b2b'

export async function GET() {
  const data = await runB2BEngine()
  return Response.json(data)
}
