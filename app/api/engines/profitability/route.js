import { runProfitabilityEngine } from '@/lib/engines/profitability'
import { fileExists } from '@/lib/parsers'

const SETTLEMENT_REQUIRED = {
  id: 'settlement',
  label: 'Settlement Report(s)',
  description: 'Monthly payment settlement — contains all Amazon fee deductions (commission, FBA fees, closing fee, tech fee), TDS, TCS, and reimbursements per order.',
  howToDownload: [
    'Go to Seller Central → Reports → Payments',
    'Click "Settlement Reports" tab',
    'Download each settlement cycle for the months you want to analyze',
    'Upload all files together via Data Management',
  ],
  frequency: 'Generated daily by Amazon (~30 files/month)',
  note: 'Settlement data is the only source for actual fee deductions per order. Without it, net proceeds and margins cannot be calculated.',
}

export async function GET() {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [SETTLEMENT_REQUIRED] })
  }
  const data = await runProfitabilityEngine()
  return Response.json(data)
}
