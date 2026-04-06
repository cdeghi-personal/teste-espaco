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

const reasons = [
  {
    icon: FiUsers,
    title: 'Equipe interdisciplinar',
    desc: 'Fisioterapia, fonoaudiologia, terapia ocupacional e psicologia atuando de forma integrada.',
  },
  {
    icon: FiHeart,
    title: 'Cuidado centrado na família',
    desc: 'Acolhemos pais e responsáveis como parte fundamental do processo de desenvolvimento.',
  },
  {
    icon: FiAward,
    title: 'Atuação baseada em ciência',
    desc: 'Utilizamos abordagens atualizadas, estruturadas e apoiadas em evidências clínicas.',
  },
  {
    icon: FiCheckCircle,
    title: 'Ambiente acolhedor e seguro',
    desc: 'Um espaço pensado para que crianças e famílias se sintam bem, confiantes e respeitadas.',
  },
]

const careTopics = [
  { title: 'TEA', subtitle: 'Transtorno do Espectro Autista', className: 'bg-brand-blue text-white', subtitleClass: 'text-blue-200', titleClass: 'text-brand-yellow' },
  { title: 'TDAH', subtitle: 'Transtorno do Déficit de Atenção', className: 'bg-brand-yellow text-brand-blue', subtitleClass: 'text-brand-blue-dark', titleClass: 'text-brand-blue' },
  { title: 'Síndrome de Down', subtitle: 'Desenvolvimento com suporte interdisciplinar', className: 'bg-green-50 border-2 border-green-200 text-gray-800', subtitleClass: 'text-gray-500', titleClass: 'text-gray-800' },
  { title: 'E muito mais', subtitle: 'Cada criança é acolhida em sua singularidade', className: 'bg-purple-50 border-2 border-purple-200 text-gray-800', subtitleClass: 'text-gray-500', titleClass: 'text-gray-800' },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-blue to-brand-blue-dark py-24 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_white,_transparent_25%)]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-yellow/20 border border-brand-yellow/40 rounded-full px-4 py-1.5 text-brand-yellow text-sm font-medium mb-6">
                <FiHeart size={14} />
                Cuidado interdisciplinar com acolhimento e ciência
              </div>

              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                Cada criança tem seu tempo.
                <br />
                <span className="text-brand-yellow">Nós respeitamos isso.</span>
              </h1>

              <p className="text-lg text-blue-100 leading-relaxed max-w-xl">
                Desenvolvimento infantil com abordagem interdisciplinar,
                unindo ciência, acolhimento e parceria com as famílias.
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
                  { value: '5+', label: 'Anos de trajetória' },
                  { value: '98%', label: 'Famílias satisfeitas' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-brand-yellow">{stat.value}</div>
                    <div className="text-xs text-blue-300 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <img
                src="/hero.png"
                alt="Casa Amarela acolhendo crianças e famílias"
                className="w-full max-w-xl rounded-3xl shadow-2xl object-cover border border-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Especialidades */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm text-gray-400 mb-2 uppercase tracking-[0.18em]">
              Atuação integrada
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nossas <span className="text-brand-blue">Especialidades</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Diferentes áreas trabalhando juntas para apoiar o desenvolvimento infantil de forma completa,
              personalizada e conectada.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(SPECIALTIES).map(([key, spec]) => (
              <Link
                key={key}
                to={`${ROUTES.SERVICES}#${key}`}
                className="group p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="text-5xl mb-5">{specialtyIcons[key]}</div>

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

      {/* Diferenciais */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm text-gray-400 mb-2 uppercase tracking-[0.18em]">
                O jeito Casa Amarela de cuidar
              </p>

              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Por que escolher a <span className="text-brand-blue">Casa Amarela?</span>
              </h2>

              <p className="text-gray-600 mb-8 leading-relaxed">
                Acreditamos que o desenvolvimento infantil acontece quando diferentes áreas se conectam.
                Por isso, trabalhamos de forma integrada, olhando para cada criança de maneira completa,
                respeitando seu tempo, sua história e seu potencial.
              </p>

              <div className="space-y-5">
                {reasons.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-brand-yellow/20 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Atuamos com crianças com:
                </h3>
                <p className="text-sm text-gray-500">
                  Diferentes perfis de desenvolvimento, sempre com olhar individualizado e integrado.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {careTopics.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-3xl p-8 flex flex-col items-center justify-center text-center aspect-square shadow-sm ${item.className}`}
                  >
                    <div className={`text-3xl md:text-4xl font-bold ${item.titleClass}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm mt-3 leading-relaxed ${item.subtitleClass}`}>
                      {item.subtitle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bloco institucional */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-brand-blue rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,_#facc15,_transparent_35%)]" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block text-sm uppercase tracking-[0.2em] text-blue-200 mb-3">
                  Nosso compromisso
                </span>
                <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                  Mais do que terapias,
                  <br />
                  uma rede de cuidado
                </h3>
              </div>

              <div>
                <p className="text-blue-100 leading-relaxed text-lg">
                  Na Casa Amarela, cada especialidade contribui para um mesmo propósito: apoiar o
                  desenvolvimento de cada criança com responsabilidade técnica, sensibilidade humana e
                  atuação interdisciplinar. Aqui, as famílias encontram acolhimento, clareza e parceria
                  verdadeira ao longo da jornada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 bg-brand-yellow/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm text-gray-400 mb-2 uppercase tracking-[0.18em]">
              Confiança construída no dia a dia
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Histórias reais de <span className="text-brand-blue">famílias</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array(5)
                    .fill(0)
                    .map((_, j) => (
                      <span key={j} className="text-brand-yellow">
                        ★
                      </span>
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
            Vamos caminhar juntos?
          </h2>

          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Estamos prontos para acolher você e sua família e construir juntos um caminho de
            desenvolvimento para o seu filho.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={ROUTES.CONTACT}
              className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-blue font-bold px-8 py-3.5 rounded-xl hover:bg-brand-yellow-dark transition-all text-base shadow-sm hover:shadow-md"
            >
              Entrar em Contato <FiArrowRight size={18} />
            </Link>

            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-green-600 transition-all text-base shadow-sm hover:shadow-md"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}