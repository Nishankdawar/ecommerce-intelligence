import { runSettlementEngine } from '@/lib/engines/settlement'
import { fileExists } from '@/lib/parsers'

export async function GET(request) {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement', label: 'Settlement Report(s)',
      description: 'The Settlement Report shows how gross revenue becomes your bank deposit.',
      howToDownload: ['Seller Central → Reports → Payments → Settlement Reports → Download all cycles for the month'],
      frequency: 'Daily (~30 files/month)',
      note: 'For a complete month, you need all ~30 daily settlement files. SP-API can automate this.',
    }]})
  }
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || null
  const data = await runSettlementEngine(month)
  return Response.json(data)
}
