import fs from 'fs'
import path from 'path'
import { DATA_FILES } from '@/lib/dataFiles'

// Detect which file type this is by checking headers
function detectFileType(content) {
  const firstLine = content.split('\n')[0].replace(/^\uFEFF/, '') // strip BOM
  const headers = firstLine.split(',').map(h => h.replace(/["\t]/g, '').trim())
  const headersTab = firstLine.split('\t').map(h => h.replace(/"/g, '').trim())
  const allHeaders = [...headers, ...headersTab]

  for (const file of DATA_FILES) {
    const matches = file.detectionColumns.every(col =>
      allHeaders.some(h => h.toLowerCase() === col.toLowerCase())
    )
    if (matches) return file
  }
  return null
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const uploadedFile = formData.get('file')
    const forceFileId = formData.get('fileId') // optional: force a specific file type

    if (!uploadedFile) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await uploadedFile.arrayBuffer())
    const rawDir = path.join(process.cwd(), 'data', 'raw')

    // If fileId is provided, use that directly
    if (forceFileId) {
      const fileConfig = DATA_FILES.find(f => f.id === forceFileId)
      if (!fileConfig) return Response.json({ error: 'Unknown file type' }, { status: 400 })

      const destPath = path.join(rawDir, fileConfig.filename)
      fs.writeFileSync(destPath, buffer)
      return Response.json({
        success: true,
        detected: fileConfig.label,
        filename: fileConfig.filename,
        sizeKb: Math.round(buffer.length / 1024),
      })
    }

    // Auto-detect by headers
    const content = buffer.toString('utf-8')
    const detected = detectFileType(content)

    if (!detected) {
      return Response.json({
        error: 'Could not identify this file. Please use the specific upload button for each file type.',
        hint: 'Make sure you are uploading the unmodified file downloaded from Seller Central.',
      }, { status: 400 })
    }

    const destPath = path.join(rawDir, detected.filename)
    fs.writeFileSync(destPath, buffer)

    return Response.json({
      success: true,
      detected: detected.label,
      filename: detected.filename,
      sizeKb: Math.round(buffer.length / 1024),
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
