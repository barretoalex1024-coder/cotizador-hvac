'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', confirm: '', company: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { company_name: form.company },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 text-center">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Cuenta creada!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Te enviamos un correo de confirmación a <strong>{form.email}</strong>. Revisa tu bandeja de entrada para activar tu cuenta.
        </p>
        <Link href="/login" className="text-brand-600 font-semibold text-sm hover:underline">
          Volver al login
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
      <p className="text-sm text-gray-500 mb-8">Empieza a cotizar proyectos HVAC gratis</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la empresa</label>
          <input
            name="company"
            type="text"
            required
            value={form.company}
            onChange={handleChange}
            placeholder="Refrigeración ABC"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="tu@empresa.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
          <input
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña</label>
          <input
            name="confirm"
            type="password"
            required
            value={form.confirm}
            onChange={handleChange}
            placeholder="Repite la contraseña"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando cuenta...
            </>
          ) : (
            'Crear cuenta gratis'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-brand-600 font-semibold hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}
