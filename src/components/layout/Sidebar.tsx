'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, LayoutDashboard, FolderOpen, User, LogOut, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/projects', label: 'Proyectos', icon: FolderOpen, exact: false },
  { href: '/dashboard/profile', label: 'Mi Empresa', icon: User, exact: false },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">HVAC Pro</span>
        </Link>
      </div>

      {/* CTA Nueva Cotización */}
      <div className="px-4 py-4">
        <Link
          href="/dashboard/projects/new"
          className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva Cotización
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              )}
            >
              <item.icon className={cn('w-5 h-5', active ? 'text-brand-400' : '')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
