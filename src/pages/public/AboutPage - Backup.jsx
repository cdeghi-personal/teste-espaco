import { FiHeart, FiEye, FiTarget, FiStar } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'

const values = [
  { icon: FiHeart, title: 'Acolhimento', desc: 'Cada família é recebida com empatia, respeito e escuta ativa, sem julgamentos.' },
  { icon: FiStar, title: 'Individualidade', desc: 'Reconhecemos que cada criança é única e elaboramos planos terapêuticos personalizados.' },
  { icon: FiTarget, title: 'Evidência Científica', desc: 'Utilizamos apenas metodologias validadas e baseadas nas melhores evidências científicas.' },
  { icon: FiEye, title: 'Transparência', desc: 'Mantemos as famílias informadas sobre todos os passos do tratamento.' },
]

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-blue to-brand-blue-dark py-20 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Sobre o Espaço Casa Amarela</h1>
            <p className="text-xl text-blue-200 leading-relaxed">
              Nascemos da crença de que toda criança merece a melhor oportunidade de desenvolver seu potencial, independentemente de suas necessidades.
            </p>
          </div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Nossa História</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  O Espaço Casa Amarela foi fundado com um propósito claro: criar um ambiente onde crianças com necessidades especiais pudessem receber cuidado multidisciplinar de qualidade, integrado e humanizado.
                </p>
                <p>
                  Escolhemos o nome "Casa Amarela" para representar calor, acolhimento e alegria — valores que guiam cada sessão, cada sorriso conquistado, cada pequena vitória comemorada ao lado das famílias.
                </p>
                <p>
                  Ao longo dos anos, construímos uma equipe altamente qualificada e apaixonada pelo que faz, sempre com foco no desenvolvimento integral de cada criança que passa por nossas portas.
                </p>
              </div>
            </div>
            <div className="bg-brand-yellow/10 rounded-3xl p-8 border-2 border-brand-yellow/30">
              <div className="text-6xl text-center mb-6">🏠</div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: '2019', label: 'Ano de fundação' },
                  { num: '200+', label: 'Crianças atendidas' },
                  { num: '4', label: 'Especialidades' },
                  { num: '8+', label: 'Terapeutas dedicados' },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-brand-blue">{item.num}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Missão Visão */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-brand-blue text-white rounded-3xl p-8">
              <div className="w-12 h-12 bg-brand-yellow rounded-2xl flex items-center justify-center mb-4">
                <FiTarget size={22} className="text-brand-blue" />
              </div>
              <h3 className="text-xl font-bold mb-3">Missão</h3>
              <p className="text-blue-200 leading-relaxed">
                Promover o desenvolvimento integral de crianças com necessidades especiais, por meio de atendimento multidisciplinar humanizado, baseado em evidências científicas e centrado na família.
              </p>
            </div>
            <div className="bg-brand-yellow rounded-3xl p-8">
              <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center mb-4">
                <FiEye size={22} className="text-brand-yellow" />
              </div>
              <h3 className="text-xl font-bold text-brand-blue mb-3">Visão</h3>
              <p className="text-brand-blue-dark leading-relaxed">
                Ser referência em cuidado multidisciplinar infantil na região, reconhecidos pela excelência técnica, pelo acolhimento às famílias e pelos resultados transformadores na vida das crianças.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossos Valores</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Os princípios que orientam cada atendimento, cada decisão e cada relação que construímos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-brand-yellow/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={24} className="text-brand-blue" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-brand-yellow/10 border-t border-brand-yellow/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Conheça nossa equipe</h2>
          <p className="text-gray-600 mb-6">Profissionais apaixonados e qualificados, prontos para fazer a diferença.</p>
          <Link
            to={ROUTES.TEAM}
            className="inline-flex items-center gap-2 bg-brand-blue text-white font-semibold px-8 py-3 rounded-xl hover:bg-brand-blue-dark transition-all"
          >
            Ver Nossa Equipe
          </Link>
        </div>
      </section>
    </div>
  )
}
