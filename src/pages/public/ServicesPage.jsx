import { FiCheckCircle } from 'react-icons/fi'
import { SPECIALTIES } from '../../constants/specialties'

const specialtyDetails = {
  FISIOTERAPIA: {
    emoji: '🏃',
    whoFor: ['Paralisia Cerebral', 'Síndrome de Down', 'Atraso no Desenvolvimento Motor', 'Miopatias', 'Lesões ortopédicas'],
    whatToDo: 'Avaliação cinesiofuncional, exercícios terapêuticos, treino de marcha, fisioterapia neurológica e respiratória.',
    expect: 'Sessões de 45 a 60 minutos, com evolução gradual e registros detalhados do progresso.',
  },
  FONOAUDIOLOGIA: {
    emoji: '💬',
    whoFor: ['TEA (Transtorno do Espectro Autista)', 'Atraso de linguagem', 'Disfluência (gagueira)', 'Desvios fonológicos', 'Dificuldades de deglutição'],
    whatToDo: 'Estimulação de linguagem oral e escrita, uso de CAA (Comunicação Aumentativa e Alternativa), terapia miofuncional.',
    expect: 'Sessões dinâmicas com atividades lúdicas adaptadas a cada criança. Orientação às famílias.',
  },
  TO: {
    emoji: '🧩',
    whoFor: ['TEA', 'TDAH', 'Dificuldades de integração sensorial', 'Paralisia Cerebral', 'Dificuldades de coordenação motora fina'],
    whatToDo: 'Treino de atividades de vida diária (AVDs), integração sensorial, estimulação cognitiva, adaptações escolares.',
    expect: 'Ambiente sensorial rico e estimulante. Foco na independência e qualidade de vida.',
  },
  PSICOLOGIA: {
    emoji: '🧠',
    whoFor: ['TEA', 'TDAH', 'Ansiedade infantil', 'Dificuldades comportamentais', 'Baixa autoestima'],
    whatToDo: 'Avaliação psicológica, terapia cognitivo-comportamental (TCC), intervenção baseada em ABA, orientação familiar.',
    expect: 'Espaço seguro e acolhedor para a criança se expressar. Parceria ativa com a família.',
  },
}

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-blue to-brand-blue-dark py-20 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nossas Especialidades</h1>
          <p className="text-xl text-blue-200 max-w-2xl">
            Uma equipe integrada trabalhando em conjunto pelo desenvolvimento pleno da sua criança.
          </p>
        </div>
      </section>

      {/* Specialties */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20">
          {Object.entries(SPECIALTIES).map(([key, spec], index) => {
            const detail = specialtyDetails[key]
            const isEven = index % 2 === 0
            return (
              <div key={key} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${!isEven ? 'lg:flex-row-reverse' : ''}`}>
                <div className={isEven ? '' : 'lg:order-2'}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-5xl">{detail.emoji}</div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${spec.color}`}>
                        Especialidade
                      </span>
                      <h2 className="text-3xl font-bold text-gray-900">{spec.label}</h2>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">O que realizamos</h3>
                    <p className="text-gray-600 leading-relaxed">{detail.whatToDo}</p>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">O que esperar</h3>
                    <p className="text-gray-600 leading-relaxed">{detail.expect}</p>
                  </div>
                </div>

                <div className={isEven ? 'lg:order-2' : ''}>
                  <div
                    className="rounded-3xl p-8"
                    style={{ backgroundColor: spec.bgColor }}
                  >
                    <h3 className="font-semibold mb-4" style={{ color: spec.textColor }}>
                      Quem se beneficia
                    </h3>
                    <ul className="space-y-3">
                      {detail.whoFor.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <FiCheckCircle size={16} style={{ color: spec.calendarColor }} className="shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Abordagem Multidisciplinar */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Abordagem Multidisciplinar</h2>
          <p className="text-gray-600 leading-relaxed text-lg mb-8">
            O grande diferencial do Espaço Casa Amarela é a integração entre as especialidades. Nossas equipes se comunicam constantemente, compartilham evoluções e traçam estratégias conjuntas para potencializar o progresso de cada criança.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(SPECIALTIES).map(([key, spec]) => (
              <div
                key={key}
                className="p-4 rounded-2xl border-2 text-center"
                style={{ borderColor: spec.calendarColor, backgroundColor: spec.bgColor }}
              >
                <div className="text-sm font-semibold" style={{ color: spec.textColor }}>{spec.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-gray-500 text-sm">↕ Comunicação constante entre todas as especialidades</div>
        </div>
      </section>
    </div>
  )
}
