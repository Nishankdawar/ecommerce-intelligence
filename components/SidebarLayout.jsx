'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Activity, Package, Tag, MapPin, Building2, Star, Bell
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sku-health', label: 'SKU Health', icon: Activity },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/promotions', label: 'Promotions', icon: Tag },
  { href: '/geography', label: 'Geography', icon: MapPin },
  { href: '/b2b', label: 'B2B Opportunities', icon: Building2 },
  { href: '/listing-quality', label: 'Listing Quality', icon: Star },
  { href: '/alerts', label: 'Alerts', icon: Bell },
]

function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 bottom-0 flex flex-col" style={{ width: 240, background: '#000', zIndex: 50 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em' }}>ecommerce</div>
        <div style={{ fontSize: 11, color: '#737373', marginTop: 2, fontWeight: 500 }}>Intelligence POC</div>
      </div>
      <nav style={{ flex: 1, padding: '12px' }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
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
    </aside>
  )
}

export default function SidebarLayout({ children }) {
  return (
    <>
      <Sidebar />
      <main style={{ marginLeft: 240, minHeight: '100vh', padding: 24 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </>
  )
}
