import { runRefundsEngine } from '@/lib/engines/refunds'
import { fileExists } from '@/lib/parsers'

export async function GET() {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement',
      label: 'Settlement Report(s)',
      description: 'Needed to calculate refund commissions — Amazon charges you a commission even on returned orders. Without the settlement file, the true cost of returns (refund amount + commission not recovered) cannot be computed.',
      howToDownload: [
        'Go to Seller Central → Reports → Payments',
        'Click "Settlement Reports" tab',
        'Download settlement cycles for the month you want',
        'Upload via Data Management',
      ],
      frequency: 'Daily (~30 files/month)',
    }]})
  }
  const data = await runRefundsEngine()
  return Response.json(data)
}
