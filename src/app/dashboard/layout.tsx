import { Sidebar } from '@/components/layout/Sidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: { default: 'Dashboard', template: '%s | HVAC Pro' } }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-none overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
