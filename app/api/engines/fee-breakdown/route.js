import { runFeeBreakdownEngine } from '@/lib/engines/feeBreakdown'
import { fileExists } from '@/lib/parsers'

export async function GET(request) {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement', label: 'Settlement Report(s)',
      description: 'Settlement report contains itemised Amazon fee deductions per order.',
      howToDownload: ['Seller Central → Reports → Payments → Settlement Reports'],
      frequency: 'Daily (~30 files/month)',
    }]})
  }
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || null
  const data = await runFeeBreakdownEngine(month)
  return Response.json(data)
}
