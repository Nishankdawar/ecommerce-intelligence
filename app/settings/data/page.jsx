'use client'
import { useState, useEffect, useRef } from 'react'
import { DATA_FILES } from '@/lib/dataFiles'
import { CheckCircle, AlertTriangle, XCircle, Upload, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

const STATUS_CONFIG = {
  fresh:   { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: CheckCircle,    label: 'Up to date' },
  warning: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: AlertTriangle,  label: 'Getting stale' },
  stale:   { color: '#DC2626', bg: '#FFF1F1', border: '#FECACA', icon: AlertTriangle,  label: 'Stale — refresh' },
  missing: { color: '#737373', bg: '#F5F5F5', border: '#E5E5E5', icon: XCircle,        label: 'Not uploaded' },
}

function FileCard({ fileConfig, statusData, onUpload }) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const inputRef = useRef(null)

  const status = statusData?.status || 'missing'
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon

  async function handleFile(file) {
    setUploading(true)
    setUploadMsg(null)
    const form = new FormData()
    form.append('file', file)
    form.append('fileId', fileConfig.id)
    try {
      const res = await fetch('/api/data-upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.success) {
        setUploadMsg({ type: 'success', text: `✓ Uploaded successfully (${data.sizeKb}KB)` })
        onUpload()
      } else {
        setUploadMsg({ type: 'error', text: data.error || 'Upload failed' })
      }
    } catch (err) {
      setUploadMsg({ type: 'error', text: err.message })
    }
    setUploading(false)
  }

  return (
    <div style={{
      background: '#FFF', border: `1px solid ${expanded ? '#000' : '#E5E5E5'}`,
      borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      {/* Header row */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{fileConfig.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{fileConfig.label}</span>
            {fileConfig.optional && (
              <span style={{ fontSize: 10, color: '#A3A3A3', background: '#F5F5F5', borderRadius: 4, padding: '1px 6px' }}>optional</span>
            )}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: cfg.color,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              borderRadius: 999, padding: '2px 8px',
            }}>
              <Icon size={11} />
              {cfg.label}
              {statusData?.daysSince !== null && statusData?.daysSince !== undefined && (
                <span style={{ fontWeight: 400 }}>
                  {statusData.daysSince === 0 ? ' · today' : ` · ${statusData.daysSince}d ago`}
                </span>
              )}
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#737373' }}>{fileConfig.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {fileConfig.powers.map(p => (
              <span key={p} style={{ fontSize: 11, background: '#F5F5F5', borderRadius: 4, padding: '2px 7px', color: '#525252' }}>{p}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', border: '1px solid #000', borderRadius: 8,
              background: '#000', color: '#FFF', fontSize: 12, fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1,
            }}
          >
            <Upload size={13} />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: '1px solid #E5E5E5', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
          >
            {expanded ? <ChevronUp size={14} color="#737373" /> : <ChevronDown size={14} color="#737373" />}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          accept=".csv,.txt,.xlsx,.xls"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* Upload feedback */}
      {uploadMsg && (
        <div style={{
          margin: '0 20px 12px', padding: '8px 12px', borderRadius: 8, fontSize: 13,
          background: uploadMsg.type === 'success' ? '#F0FDF4' : '#FFF1F1',
          color: uploadMsg.type === 'success' ? '#16A34A' : '#DC2626',
          border: `1px solid ${uploadMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {uploadMsg.text}
        </div>
      )}

      {/* Expanded — how to download */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F5F5F5', padding: '16px 20px', background: '#FAFAFA' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373', marginBottom: 10 }}>
            How to download from Seller Central
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fileConfig.howToDownload.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: '#000', lineHeight: 1.6 }}>{step}</li>
            ))}
          </ol>
          {statusData?.sizeKb && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#A3A3A3' }}>
              Current file: {fileConfig.filename} · {statusData.sizeKb}KB
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DataSettingsPage() {
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadStatus() {
    const res = await fetch('/api/data-status')
    const data = await res.json()
    setStatusData(data)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadStatus() }, [])

  function handleRefresh() {
    setRefreshing(true)
    loadStatus()
  }

  if (loading) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { files, summary } = statusData
  const fileMap = Object.fromEntries(files.map(f => [f.id, f]))

  // Files that are stale/missing and not optional — affects modules
  const criticalIssues = files.filter(f => !f.optional && (f.status === 'stale' || f.status === 'missing'))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Data Management</h1>
          <p style={{ fontSize: 13, color: '#737373', margin: 0 }}>
            Upload reports downloaded from Seller Central · Click any row to see download instructions
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E5E5E5', borderRadius: 8, background: '#FFF', fontSize: 13, cursor: 'pointer' }}
        >
          <RefreshCw size={14} color={refreshing ? '#A3A3A3' : '#000'} />
          {refreshing ? 'Refreshing...' : 'Refresh status'}
        </button>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Up to date', count: summary.fresh, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Getting stale', count: summary.warning, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Stale / overdue', count: summary.stale, color: '#DC2626', bg: '#FFF1F1', border: '#FECACA' },
          { label: 'Missing', count: summary.missing, color: '#737373', bg: '#F5F5F5', border: '#E5E5E5' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 12, color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Critical issues banner */}
      {criticalIssues.length > 0 && (
        <div style={{ background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#B91C1C', marginBottom: 6 }}>
            ⚠ {criticalIssues.length} file{criticalIssues.length > 1 ? 's' : ''} need attention
          </div>
          {criticalIssues.map(f => {
            const config = DATA_FILES.find(d => d.id === f.id)
            return (
              <div key={f.id} style={{ fontSize: 12, color: '#B91C1C', marginBottom: 4 }}>
                <strong>{f.label}</strong> — affects: {config?.powers.join(', ')}
              </div>
            )
          })}
        </div>
      )}

      {/* File cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DATA_FILES.map(fileConfig => (
          <FileCard
            key={fileConfig.id}
            fileConfig={fileConfig}
            statusData={fileMap[fileConfig.id]}
            onUpload={loadStatus}
          />
        ))}
      </div>

      <div style={{ marginTop: 24, padding: '12px 16px', background: '#F5F5F5', borderRadius: 8, fontSize: 12, color: '#737373' }}>
        Files are saved to the server and used immediately by all dashboard modules. After uploading, navigate to any page to see updated data.
      </div>
    </div>
  )
}
