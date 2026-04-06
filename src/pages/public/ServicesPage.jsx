import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'
import { SPECIALTIES } from '../../constants/specialties'

const specialtyDetails = {
  FISIOTERAPIA: {
    emoji: '🏃',
    image: '/Fisioterapia.png',
    whoFor: ['Paralisia Cerebral', 'Síndrome de Down', 'Atraso no Desenvolvimento Motor', 'Miopatias', 'Lesões ortopédicas'],
    whatToDo: 'Avaliação cinesiofuncional, exercícios terapêuticos, treino de marcha, fisioterapia neurológica e respiratória.',
    expect: 'Sessões de 45 a 60 minutos, com evolução gradual e registros detalhados do progresso.',
  },
  FONOAUDIOLOGIA: {
    emoji: '💬',
    image: '/Fonoaudiologia.png',
    whoFor: ['TEA', 'Atraso de linguagem', 'Gagueira', 'Desvios fonológicos', 'Dificuldades de deglutição'],
    whatToDo: 'Estimulação de linguagem oral e escrita, uso de CAA, terapia miofuncional.',
    expect: 'Sessões dinâmicas e lúdicas com orientação às famílias.',
  },
  TO: {
    emoji: '🧩',
    image: '/Terapia_Ocupacional.png',
    whoFor: ['TEA', 'TDAH', 'Integração sensorial', 'Paralisia Cerebral', 'Coordenação motora'],
    whatToDo: 'Treino de AVDs, integração sensorial, estimulação cognitiva.',
    expect: 'Foco em independência e qualidade de vida.',
  },
  PSICOLOGIA: {
    emoji: '🧠',
    image: '/Psicologia.png',
    whoFor: ['TEA', 'TDAH', 'Ansiedade', 'Comportamento', 'Autoestima'],
    whatToDo: 'Avaliação psicológica, TCC, ABA, orientação familiar.',
    expect: 'Ambiente seguro e acolhedor.',
  },
}

export default function ServicesPage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return

    const id = location.hash.replace('#', '')
    const element = document.getElementById(id)

    if (element) {
      setTimeout(() => {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
  }, [location])

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue to-brand-blue-dark py-24 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <span className="inline-flex bg-white/10 px-4 py-1 rounded-full text-sm mb-6">
            Nossa atuação
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Nossas <span className="text-brand-yellow">Especialidades</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl">
            Diferentes saberes integrados para desenvolver cada criança de forma única.
          </p>
        </div>
      </section>

      {/* ESPECIALIDADES */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 space-y-20">
          {Object.entries(SPECIALTIES).map(([key, spec], index) => {
            const detail = specialtyDetails[key]
            const isEven = index % 2 === 0

            return (
              <div
                key={key}
                id={key}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center scroll-mt-28"
              >
                {/* IMAGEM */}
                <div className={`${isEven ? '' : 'lg:order-2'}`}>
                  <div className="overflow-hidden rounded-3xl shadow-md">
                    <img
                      src={detail.image}
                      alt={spec.label}
                      className="w-full h-[360px] md:h-[420px] object-cover"
                    />
                  </div>
                </div>

                {/* TEXTO */}
                <div className={`${isEven ? '' : 'lg:order-1'}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-5xl">{detail.emoji}</div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs ${spec.color}`}>
                        Especialidade
                      </span>
                      <h2 className="text-3xl font-bold">{spec.label}</h2>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
                        O que fazemos
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {detail.whatToDo}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
                        O que esperar
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {detail.expect}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 border">
                      <h3 className="font-semibold mb-4">Quem se beneficia</h3>
                      <ul className="space-y-3">
                        {detail.whoFor.map((item) => (
                          <li key={item} className="flex gap-3 items-center">
                            <FiCheckCircle className="text-brand-blue" />
                            <span className="text-sm text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* BLOCO DIFERENCIAL */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <span className="text-sm uppercase tracking-widest text-gray-400">
            Diferencial Casa Amarela
          </span>

          <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-6">
            Integração entre especialidades
          </h2>

          <p className="text-gray-600 text-lg leading-relaxed mb-10">
            Nosso grande diferencial é a atuação interdisciplinar. As especialidades não trabalham isoladas —
            elas se conectam, compartilham evolução e constroem estratégias conjuntas para potencializar o desenvolvimento de cada criança.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {Object.entries(SPECIALTIES).map(([key, spec]) => (
              <div
                key={key}
                className="px-5 py-3 rounded-full text-sm font-medium border"
                style={{ borderColor: spec.calendarColor, color: spec.textColor }}
              >
                {spec.label}
              </div>
            ))}
          </div>

          <div className="mt-6 text-gray-400 text-sm">
            Comunicação contínua entre toda a equipe
          </div>
        </div>
      </section>
    </div>
  )
}