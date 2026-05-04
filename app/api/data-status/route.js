import fs from 'fs'
import path from 'path'
import { DATA_FILES, getFileStatus } from '@/lib/dataFiles'

export async function GET() {
  const rawDir = path.join(process.cwd(), 'data', 'raw')

  const files = DATA_FILES.map(file => {
    const filePath = path.join(rawDir, file.filename)
    let lastModified = null
    let exists = false
    let sizeKb = null

    try {
      const stat = fs.statSync(filePath)
      exists = true
      lastModified = stat.mtime.toISOString()
      sizeKb = Math.round(stat.size / 1024)
    } catch {
      // file doesn't exist
    }

    const status = getFileStatus(lastModified, file.staleAfterDays)
    const daysSince = lastModified
      ? Math.floor((Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      id: file.id,
      label: file.label,
      filename: file.filename,
      exists,
      status,         // 'fresh' | 'warning' | 'stale' | 'missing'
      lastModified,
      daysSince,
      sizeKb,
      staleAfterDays: file.staleAfterDays,
      powers: file.powers,
      optional: file.optional || false,
    }
  })

  const fresh = files.filter(f => f.status === 'fresh').length
  const warning = files.filter(f => f.status === 'warning').length
  const stale = files.filter(f => f.status === 'stale').length
  const missing = files.filter(f => f.status === 'missing').length

  return Response.json({ files, summary: { fresh, warning, stale, missing } })
}
