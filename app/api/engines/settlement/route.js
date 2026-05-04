import { runSettlementEngine } from '@/lib/engines/settlement'
import { fileExists } from '@/lib/parsers'

export async function GET() {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement',
      label: 'Settlement Report(s)',
      description: 'The Settlement Report is the primary source for this entire module — it shows the exact breakdown of how your gross revenue becomes the actual deposit in your bank account, cycle by cycle.',
      howToDownload: [
        'Go to Seller Central → Reports → Payments',
        'Click "Settlement Reports" tab',
        'You will see a list of all past settlement cycles (one generated every 1-2 days)',
        'Download the cycles for the month you want to reconcile',
        'Upload all of them together via Data Management',
      ],
      frequency: 'Daily (~30 files/month)',
      note: 'For a complete month, you need all ~30 daily settlement files. SP-API can automate this.',
    }]})
  }
  const data = await runSettlementEngine()
  return Response.json(data)
}
