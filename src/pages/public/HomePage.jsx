import { Link } from 'react-router-dom'
import { FiArrowRight, FiHeart, FiUsers, FiAward, FiCheckCircle } from 'react-icons/fi'
import { ROUTES } from '../../constants/routes'
import { SPECIALTIES } from '../../constants/specialties'

const specialtyIcons = {
  FISIOTERAPIA: '🏃',
  FONOAUDIOLOGIA: '💬',
  TO: '🧩',
  PSICOLOGIA: '🧠',
}

const testimonials = [
  {
    text: 'O Espaço Casa Amarela transformou a vida do meu filho. Em 6 meses de fonoaudiologia ele já consegue se comunicar muito melhor!',
    author: 'Maria F.',
    relation: 'Mãe do Lucas, 6 anos',
  },
  {
    text: 'A equipe é maravilhosa, muito atenciosa e parceira na jornada. Sinto que não estamos sozinhos nessa.',
    author: 'Roberto A.',
    relation: 'Pai da Sofia, 8 anos',
  },
  {
    text: 'A abordagem multidisciplinar fez toda a diferença. Minha filha evoluiu em todas as áreas ao mesmo tempo.',
    author: 'Claudia N.',
    relation: 'Mãe da Isabela, 9 anos',
  },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-blue via-brand-blue to-brand-blue-dark overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-brand-yellow rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-yellow/20 border border-brand-yellow/40 rounded-full px-4 py-1.5 text-brand-yellow text-sm font-medium mb-6">
                <FiHeart size={14} />
                Cuidado especializado para cada criança
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                Cada criança tem seu
                <span className="text-brand-yellow"> ritmo único</span>
              </h1>
              <p className="text-lg text-blue-200 leading-relaxed mb-8">
                No Espaço Casa Amarela, oferecemos atendimento multidisciplinar especializado para crianças com TEA, TDAH, Síndrome de Down e outras necessidades especiais, com amor e ciência.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={ROUTES.CONTACT}
                  className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-blue font-bold px-8 py-3.5 rounded-xl hover:bg-brand-yellow-dark transition-all shadow-lg text-base"
                >
                  Agendar Avaliação
                  <FiArrowRight size={18} />
                </Link>
                <Link
                  to={ROUTES.SERVICES}
                  className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/20 transition-all text-base"
                >
                  Conhecer Especialidades
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 mt-10">
                {[
                  { value: '200+', label: 'Pacientes atendidos' },
                  { value: '4', label: 'Especialidades' },
                  { value: '5+', label: 'Anos de experiência' },
                  { value: '98%', label: 'Famílias satisfeitas' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-brand-yellow">{stat.value}</div>
                    <div className="text-xs text-blue-300 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image */}
            <div className="hidden lg:flex items-center justify-center">
              <img
                src="/hero.png"
                alt="Crianças no Espaço Casa Amarela"
                className="w-full max-w-lg rounded-2xl shadow-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Especialidades */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nossas <span className="text-brand-blue">Especialidades</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Uma equipe completa e integrada trabalhando juntos pelo desenvolvimento saudável da sua criança.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(SPECIALTIES).map(([key, spec]) => (
              <Link
                key={key}
                to={ROUTES.SERVICES}
                className="group p-6 rounded-2xl border-2 border-gray-100 hover:border-brand-yellow hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-4xl mb-4">{specialtyIcons[key]}</div>
                <div
                  className="w-1 h-10 rounded-full mx-auto mb-4 group-hover:h-14 transition-all duration-300"
                  style={{ backgroundColor: spec.calendarColor }}
                />
                <h3 className="font-bold text-gray-900 text-base mb-2">{spec.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{spec.description}</p>
                <div className="mt-4 text-brand-blue text-sm font-medium group-hover:gap-2 flex items-center justify-center gap-1 transition-all">
                  Saiba mais <FiArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Por que nós */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Por que escolher o <span className="text-brand-blue">Espaço Casa Amarela?</span>
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Acreditamos que cada criança tem um potencial único a ser descoberto. Nossa abordagem integrativa garante que todos os aspectos do desenvolvimento sejam tratados de forma harmônica e personalizada.
              </p>
              <div className="space-y-4">
                {[
                  { icon: FiUsers, title: 'Equipe Multidisciplinar', desc: 'Fisioterapeutas, fonoaudiólogos, terapeutas ocupacionais e psicólogos trabalhando juntos' },
                  { icon: FiHeart, title: 'Centrado na Família', desc: 'Envolvemos pais e responsáveis em todas as etapas do tratamento' },
                  { icon: FiAward, title: 'Baseado em Evidências', desc: 'Metodologias científicas atualizadas e validadas pela comunidade clínica' },
                  { icon: FiCheckCircle, title: 'Ambiente Acolhedor', desc: 'Espaço pensado para o conforto e segurança das crianças e suas famílias' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-yellow/20 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
                      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-blue rounded-3xl p-8 text-white flex flex-col items-center justify-center text-center aspect-square">
                <div className="text-5xl font-bold text-brand-yellow">TEA</div>
                <div className="text-sm text-blue-200 mt-2">Transtorno do<br />Espectro Autista</div>
              </div>
              <div className="bg-brand-yellow rounded-3xl p-8 text-brand-blue flex flex-col items-center justify-center text-center aspect-square">
                <div className="text-5xl font-bold">TDAH</div>
                <div className="text-sm text-brand-blue-dark mt-2 font-medium">Transtorno do<br />Déficit de Atenção</div>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center aspect-square">
                <div className="text-4xl mb-2">🌟</div>
                <div className="text-sm font-semibold text-gray-700">Síndrome de Down</div>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center aspect-square">
                <div className="text-4xl mb-2">💙</div>
                <div className="text-sm font-semibold text-gray-700">E muito mais...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 bg-brand-yellow/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              O que dizem as <span className="text-brand-blue">famílias</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex gap-0.5 mb-4">
                  {Array(5).fill(0).map((_, j) => (
                    <span key={j} className="text-brand-yellow">★</span>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.author}</p>
                  <p className="text-xs text-gray-500">{t.relation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-blue">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Dê o primeiro passo hoje
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Entre em contato conosco e agende uma avaliação inicial. Nossa equipe está pronta para acolher você e sua família.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={ROUTES.CONTACT}
              className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-blue font-bold px-8 py-3.5 rounded-xl hover:bg-brand-yellow-dark transition-all text-base"
            >
              Entrar em Contato <FiArrowRight size={18} />
            </Link>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-green-600 transition-all text-base"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
