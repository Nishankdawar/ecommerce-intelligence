import { runWarehouseOptimizationEngine } from '@/lib/engines/warehouseOptimization'
import { fileExists } from '@/lib/parsers'

export async function GET(request) {
  if (!fileExists('settlement-march-2026.xlsx')) {
    return Response.json({ _unavailable: true, missing_files: [{
      id: 'settlement', label: 'Settlement Report(s)',
      description: 'Needed to get actual FBA fulfillment fee per order for cross-state cost analysis.',
      howToDownload: ['Seller Central → Reports → Payments → Settlement Reports'],
      frequency: 'Daily (~30 files/month)',
    }]})
  }
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || null
  const data = await runWarehouseOptimizationEngine(month)
  return Response.json(data)
}
