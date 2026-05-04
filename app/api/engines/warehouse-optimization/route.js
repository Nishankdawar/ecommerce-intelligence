import { runWarehouseOptimizationEngine } from '@/lib/engines/warehouseOptimization'
import { fileExists } from '@/lib/parsers'

export async function GET() {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement',
      label: 'Settlement Report(s)',
      description: 'Needed to get the actual FBA fulfillment fee per order — this is what lets us calculate the cost difference between a cross-state shipment vs an intra-state one, and estimate how much you can save by redistributing stock.',
      howToDownload: [
        'Go to Seller Central → Reports → Payments',
        'Click "Settlement Reports" tab',
        'Download settlement cycles for the month you want',
        'Upload via Data Management',
      ],
      frequency: 'Daily (~30 files/month)',
    }]})
  }
  const data = await runWarehouseOptimizationEngine()
  return Response.json(data)
}
