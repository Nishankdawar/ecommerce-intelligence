import { runFeeBreakdownEngine } from '@/lib/engines/feeBreakdown'
import { fileExists } from '@/lib/parsers'

export async function GET() {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement',
      label: 'Settlement Report(s)',
      description: 'Settlement report is the only file that contains itemised Amazon fee deductions — commission %, FBA pick & pack, weight handling, closing fee, technology fee per order.',
      howToDownload: [
        'Go to Seller Central → Reports → Payments',
        'Click "Settlement Reports" tab',
        'Download settlement cycles for the month you want',
        'Upload via Data Management',
      ],
      frequency: 'Daily (~30 files/month)',
    }]})
  }
  const data = await runFeeBreakdownEngine()
  return Response.json(data)
}
