'use client'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

export default function Tooltip({ content, children, maxWidth = 280 }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)

  function show() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = Math.min(rect.left, window.innerWidth - maxWidth - 12)
    setPos({ top: rect.bottom + 6, left: Math.max(8, left) })
    setVisible(true)
  }

  function hide() { setVisible(false) }

  const tooltip = visible ? createPortal(
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
      background: '#000', color: '#FFF', borderRadius: 8,
      padding: '10px 13px', fontSize: 12, lineHeight: 1.6,
      maxWidth, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      pointerEvents: 'none', wordBreak: 'break-word',
      textTransform: 'none', fontWeight: 'normal', letterSpacing: 'normal',
    }}>
      {content}
    </div>,
    document.body
  ) : null

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
      >
        {children ?? <Info size={13} color="#A3A3A3" />}
      </span>
      {tooltip}
    </>
  )
}

// Inline label + tooltip icon combo — e.g. for table headers or section labels
export function LabelWithTooltip({ label, tooltip, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...style }}>
      {label}
      <Tooltip content={tooltip}><Info size={12} color="#A3A3A3" /></Tooltip>
    </span>
  )
}
