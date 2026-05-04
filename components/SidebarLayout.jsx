'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, Package, Tag, MapPin, Building2, Star, Bell, Menu, X, TrendingUp, PieChart, RotateCcw, Wallet, Warehouse, Settings } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sku-health', label: 'SKU Health', icon: Activity },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/promotions', label: 'Promotions', icon: Tag },
  { href: '/geography', label: 'Geography', icon: MapPin },
  { href: '/b2b', label: 'B2B Opportunities', icon: Building2 },
  { href: '/listing-quality', label: 'Listing Quality', icon: Star },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { group: 'March 2026' },
  { href: '/profitability', label: 'Profitability', icon: TrendingUp },
  { href: '/fee-breakdown', label: 'Fee Breakdown', icon: PieChart },
  { href: '/refunds', label: 'Refund P&L', icon: RotateCcw },
  { href: '/settlement', label: 'Settlement', icon: Wallet },
  { href: '/warehouse-optimization', label: 'Warehouse Opt.', icon: Warehouse },
  { group: 'Settings' },
  { href: '/settings/data', label: 'Data Management', icon: Settings },
]

function SidebarContent({ onNavClick }) {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000' }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em' }}>ecommerce</div>
        <div style={{ fontSize: 11, color: '#737373', marginTop: 2, fontWeight: 500 }}>Intelligence POC</div>
      </div>
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        {nav.map((item) => {
          if (item.group) {
            return (
              <div key={item.group} style={{ padding: '10px 12px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#525252', marginTop: 4 }}>
                {item.group}
              </div>
            )
          }
          const { href, label, icon: Icon } = item
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                marginBottom: 2, borderRadius: 8, textDecoration: 'none',
                background: active ? '#FFF' : 'transparent',
                color: active ? '#000' : '#A3A3A3',
                fontSize: 13, fontWeight: active ? 600 : 400,
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: '#525252' }}>
        April 2026 · POC
      </div>
    </div>
  )
}

export default function SidebarLayout({ children }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 240, zIndex: 50 }}>
          <SidebarContent />
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
          />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 70 }}>
            <SidebarContent onNavClick={() => setOpen(false)} />
          </aside>
        </>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 52,
          background: '#000', display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 12, zIndex: 50,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            {open ? <X size={20} color="#FFF" /> : <Menu size={20} color="#FFF" />}
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em' }}>ecommerce</span>
        </div>
      )}

      <main style={{
        marginLeft: isMobile ? 0 : 240,
        marginTop: isMobile ? 52 : 0,
        minHeight: '100vh',
        padding: isMobile ? 16 : 24,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </>
  )
}
