import { runWarehouseOptimizationEngine } from '@/lib/engines/warehouseOptimization'
export async function GET() {
  const data = await runWarehouseOptimizationEngine()
  return Response.json(data)
}
