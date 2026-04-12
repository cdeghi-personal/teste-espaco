import { useState } from 'react'
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiCheck } from 'react-icons/fi'
import { SPECIALTIES } from '../../constants/specialties'
import { supabase } from '../../lib/supabase'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', specialty: '', message: '', howFound: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('contact_leads').insert({
      name:       form.name,
      phone:      form.phone,
      email:      form.email || null,
      specialty:  form.specialty || null,
      how_found:  form.howFound || null,
      message:    form.message,
    })
    setLoading(false)
    if (err) {
      setError('Ocorreu um erro ao enviar. Tente novamente ou entre em contato por WhatsApp.')
    } else {
      setSent(true)
    }
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-blue to-brand-blue-dark py-20 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Fale Conosco</h1>
          <p className="text-xl text-blue-200 max-w-2xl">
            Tire suas dúvidas ou agende uma visita. Estamos aqui para ajudar sua família.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Envie uma mensagem</h2>
              {sent ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheck size={28} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">Mensagem enviada!</h3>
                  <p className="text-green-600">Entraremos em contato em breve. Obrigado!</p>
                  <button
                    onClick={() => { setSent(false); setForm({ name: '', phone: '', email: '', specialty: '', message: '', howFound: '' }) }}
                    className="mt-4 text-sm text-green-700 underline"
                  >
                    Enviar outra mensagem
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp *</label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                        placeholder="(11) 9 9999-9999"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade de interesse</label>
                    <select
                      name="specialty"
                      value={form.specialty}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                    >
                      <option value="">Selecione (opcional)</option>
                      {Object.entries(SPECIALTIES).map(([key, spec]) => (
                        <option key={key} value={key}>{spec.label}</option>
                      ))}
                      <option value="multiple">Mais de uma especialidade</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Como nos conheceu?</label>
                    <select
                      name="howFound"
                      value={form.howFound}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                    >
                      <option value="">Selecione</option>
                      <option>Indicação médica</option>
                      <option>Indicação de amigos/família</option>
                      <option>Instagram</option>
                      <option>Google</option>
                      <option>Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-none"
                      placeholder="Conte-nos sobre sua criança e como podemos ajudar..."
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-brand-blue-dark transition-all disabled:opacity-60"
                  >
                    {loading ? 'Enviando...' : (<><FiSend size={16} /> Enviar Mensagem</>)}
                  </button>
                </form>
              )}
            </div>

            {/* Info */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Informações de Contato</h2>

              {[
                { icon: FiMapPin, title: 'Endereço', content: 'Rua das Crianças, 123\nSão Paulo - SP, CEP 01234-567' },
                { icon: FiPhone, title: 'Telefone / WhatsApp', content: '(11) 9 9999-9999' },
                { icon: FiMail, title: 'E-mail', content: 'contato@casaamarela.com.br' },
                { icon: FiClock, title: 'Horário de Atendimento', content: 'Segunda a Sexta: 8h às 18h\nSábado: 8h às 12h' },
              ].map(({ icon: Icon, title, content }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 bg-brand-yellow/20 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-brand-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
                    <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-line">{content}</p>
                  </div>
                </div>
              ))}

              <div className="mt-6">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-green-500 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-green-600 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Falar pelo WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
