import { runGeographyEngine } from '@/lib/engines/geography'

export async function GET() {
  const data = await runGeographyEngine()
  return Response.json(data)
}
