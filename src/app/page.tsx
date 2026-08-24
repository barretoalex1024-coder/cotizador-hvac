import Link from 'next/link'
import { Zap, BarChart2, FileText, Shield, ChevronRight, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Cálculo instantáneo de BTU',
    desc: 'Ingresa área, zona climática y tipo de construcción — el sistema calcula la carga térmica en segundos.',
  },
  {
    icon: BarChart2,
    title: 'Cotizaciones precisas',
    desc: 'Equipo, ductos, tuberías, mano de obra y margen de ganancia integrados en una sola pantalla.',
  },
  {
    icon: FileText,
    title: 'Propuestas PDF profesionales',
    desc: 'Genera propuestas con tu logo, datos del cliente y desglose técnico listas para enviar.',
  },
  {
    icon: Shield,
    title: 'Datos seguros',
    desc: 'Cada contratista solo ve sus propios proyectos. Cifrado de extremo a extremo con Supabase.',
  },
]

const plans = [
  { label: 'Starter', price: '0', desc: 'Hasta 5 proyectos/mes', highlight: false },
  { label: 'Pro', price: '499', desc: 'Proyectos ilimitados + PDF', highlight: true },
  { label: 'Empresa', price: '1,299', desc: 'Multi-usuario + soporte prioritario', highlight: false },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">HVAC Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register" className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors font-medium">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            <CheckCircle className="w-3.5 h-3.5" />
            Para contratistas de aire acondicionado
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Cotiza proyectos HVAC<br />
            <span className="text-brand-600">10× más rápido</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Calcula BTU, selecciona equipos, genera propuestas PDF profesionales y gana más contratos — todo desde una sola plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
            >
              Crear cuenta gratis <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl text-base font-semibold hover:bg-gray-200 transition-colors"
            >
              Ver demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Todo lo que necesitas para vender más</h2>
          <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
            Diseñado específicamente para contratistas HVAC en México y Latinoamérica.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Precios simples</h2>
          <p className="text-gray-500 mb-14">Sin contratos. Cancela cuando quieras.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.label}
                className={`rounded-2xl p-8 border-2 ${
                  p.highlight
                    ? 'border-brand-600 bg-brand-600 text-white shadow-xl shadow-brand-600/25'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <div className={`text-sm font-semibold mb-2 ${p.highlight ? 'text-brand-100' : 'text-gray-500'}`}>
                  {p.label}
                </div>
                <div className="text-4xl font-extrabold mb-1">
                  ${p.price}
                  <span className={`text-base font-normal ${p.highlight ? 'text-brand-200' : 'text-gray-400'}`}>/mes</span>
                </div>
                <div className={`text-sm mb-6 ${p.highlight ? 'text-brand-100' : 'text-gray-500'}`}>{p.desc}</div>
                <Link
                  href="/register"
                  className={`block text-center text-sm font-semibold py-3 rounded-xl transition-colors ${
                    p.highlight
                      ? 'bg-white text-brand-600 hover:bg-brand-50'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Empezar
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-600 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Listo para ganar más contratos?</h2>
          <p className="text-brand-200 mb-8 text-lg">
            Únete a cientos de contratistas que ya ahorran horas en cada cotización.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-brand-600 px-8 py-4 rounded-xl font-bold text-base hover:bg-brand-50 transition-colors"
          >
            Crear cuenta gratis <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <span className="font-semibold text-gray-600 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-brand-600" /> HVAC Pro
          </span>
          <span>© {new Date().getFullYear()} HVAC Pro. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  )
}
