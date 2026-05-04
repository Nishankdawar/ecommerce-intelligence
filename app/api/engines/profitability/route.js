import { runProfitabilityEngine } from '@/lib/engines/profitability'
import { fileExists } from '@/lib/parsers'

export async function GET(request) {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement', label: 'Settlement Report(s)',
      description: 'Monthly payment settlement — contains all Amazon fee deductions per order.',
      howToDownload: ['Seller Central → Reports → Payments → Settlement Reports → Download cycles for the month'],
      frequency: 'Daily (~30 files/month)',
      powers: ['Profitability', 'Fee Breakdown', 'Refund P&L', 'Settlement', 'Warehouse Optimization'],
    }]})
  }
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || null
  const data = await runProfitabilityEngine(month)
  return Response.json(data)
}
