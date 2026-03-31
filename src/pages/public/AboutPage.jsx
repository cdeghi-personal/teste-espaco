import {
  FiHeart,
  FiEye,
  FiTarget,
  FiStar,
  FiUsers,
  FiShield,
  FiBookOpen,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'

const values = [
  {
    icon: FiHeart,
    title: 'Acolhimento genuíno',
    desc: 'Recebemos cada criança e cada família com empatia, escuta ativa e respeito à sua história, criando um ambiente seguro e de confiança.',
  },
  {
    icon: FiStar,
    title: 'Olhar para a individualidade',
    desc: 'Cada criança é única. Construímos caminhos personalizados, respeitando seu tempo, suas necessidades e seu potencial.',
  },
  {
    icon: FiUsers,
    title: 'Integração entre saberes',
    desc: 'Acreditamos que o desenvolvimento não acontece de forma isolada. Trabalhamos de forma interdisciplinar, conectando diferentes especialidades para um cuidado mais completo e assertivo.',
  },
  {
    icon: FiBookOpen,
    title: 'Compromisso com a ciência',
    desc: 'Nossa atuação é baseada em evidências científicas, garantindo qualidade, consistência e segurança em cada intervenção.',
  },
  {
    icon: FiTarget,
    title: 'Parceria com as famílias',
    desc: 'Acreditamos que o desenvolvimento acontece em conjunto. Caminhamos lado a lado com as famílias, compartilhando conhecimento e construindo soluções juntos.',
  },
  {
    icon: FiShield,
    title: 'Ética, transparência e respeito',
    desc: 'Agimos com clareza, responsabilidade e respeito em todas as relações — com crianças, famílias e equipe.',
  },
  {
    icon: FiEye,
    title: 'Amor pelo que fazemos',
    desc: 'Colocamos dedicação, sensibilidade e propósito em cada atendimento, porque acreditamos no impacto real do nosso trabalho na vida das pessoas.',
  },
]

const storyParts = [
  {
    title: 'O início de um sonho',
    image: '/Nossa_Historia_1.jpg',
    imageAlt: 'Profissionais reunidos planejando o início da Casa Amarela',
    content: [
      'Toda grande história começa com um sonho. E a Casa Amarela não foi diferente. Ela nasceu do desejo profundo de profissionais apaixonados pelo que fazem, que sempre buscaram mais do que apenas um espaço de atendimento.',
      'Queríamos um lugar de acolhimento, onde cada criança, cada família e cada profissional encontrasse suporte, conhecimento e evolução.',
      'O primeiro passo foi dado pelo Gian, que idealizou uma equipe com especialistas, onde pudesse aplicar seu conhecimento de forma integrada. Ele via o movimento e o pensamento, cognição, emoção e comportamento, como elementos inseparáveis no processo de desenvolvimento.',
      'Compartilhou essa ideia com a Fabiana, que imediatamente abraçou o projeto e viu ali uma oportunidade de unir forças. Juntos, decidiram apresentar a ideia para a Liz, que somou ao conceito sua expertise no aprendizado e no desenvolvimento infantil.',
      'Assim nasceu o Espaço IMAA — Interconexão, Movimento, Ação e Aprendizagem. Durante dois anos, o espaço funcionou em duas salas e foi crescendo a cada dia. Com o aumento da demanda, a expansão se tornou inevitável.',
      'Foi nesse momento que a Ana Paula chegou, agregando conhecimento e experiência através da comunicação e linguagem. Pouco depois, a Priscila também se juntou ao time, trazendo sua contribuição por meio da Análise do Comportamento Aplicada.',
    ],
  },
  {
    title: 'Do IMAA à Casa Amarela',
    image: '/Nossa_Historia_2.jpg',
    imageAlt: 'A Casa Amarela representando a transição do IMAA para um novo espaço',
    content: [
      'Os pacientes foram chegando, os atendimentos se multiplicando e o espaço começou a ficar pequeno. As famílias queriam mais: um lugar que pudesse oferecer um acompanhamento mais completo, onde as especialidades se conectassem de forma fluida e assertiva. E assim surgiu o desejo de algo maior.',
      'Durante esse processo de crescimento e transição, algo especial aconteceu: ao encontrarmos o novo espaço, ele já era pintado de amarelo. Naturalmente, começamos a chamá-lo assim no dia a dia — “Vamos atender no IMAA ou na Casa Amarela?” — até que o nome simplesmente ficou.',
      'Sem planejamento, sem imposição, a identidade do nosso espaço nasceu de forma espontânea, inspirada pelo entusiasmo da equipe, pelo carinho das crianças e pela conexão que já sentíamos com aquele lugar.',
      'Para elas, não era apenas um consultório ou uma clínica. Era um lugar seguro, acolhedor, onde se sentiam bem. E assim o Espaço IMAA se transformou na Casa Amarela.',
      'Mais do que um espaço de atendimentos, a Casa Amarela se tornou um ambiente onde profissionais de diferentes áreas trabalham juntos de forma interdisciplinar, compartilhando conhecimento e construindo estratégias integradas para o desenvolvimento dos pacientes.',
    ],
  },
  {
    title: 'Uma história construída a muitas mãos',
    image: '/Nossa_Historia_3.jpg',
    imageAlt: 'Criança, família e profissional em momento de cuidado e desenvolvimento',
    content: [
      'A Casa Amarela não nasceu apenas de um planejamento estruturado. Ela nasceu do encontro de sonhos, de histórias entrelaçadas e da vontade genuína de fazer a diferença na vida de tantas crianças e famílias.',
      'Cada integrante trouxe sua bagagem, sua experiência e seu desejo sincero de oferecer um atendimento de qualidade, pautado em ciência, respeito e afeto.',
      'Hoje, a Casa Amarela é um espaço vivo, onde crianças, famílias e profissionais caminham juntos. Nosso compromisso vai além do atendimento: buscamos criar uma rede de apoio, oferecer informações de qualidade e garantir que cada indivíduo atendido receba o que há de melhor dentro de nossas áreas de atuação.',
      'Seguimos acreditando na conexão, na ética e no amor como bases do nosso trabalho. Aqui, não apenas atendemos, mas transformamos vidas.',
      'E essa é a nossa história, construída a muitas mãos e com um único propósito: fazer a diferença na vida de cada família que passa pela nossa Casa Amarela. 💛✨',
    ],
  },
]

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue to-brand-blue-dark py-24 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#facc15,_transparent_30%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-blue-100 mb-6">
              Nossa essência
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Sobre a <span className="text-brand-yellow">Casa Amarela</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 leading-relaxed max-w-2xl">
              Nascemos do encontro de sonhos, da união entre diferentes saberes e do desejo profundo de acolher
              crianças e famílias com cuidado, ciência e afeto.
            </p>
          </div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nossa História</h2>
            <p className="text-gray-500 leading-relaxed">
              Uma trajetória construída com propósito, colaboração e o compromisso de transformar a vida de
              crianças e famílias por meio de um cuidado verdadeiramente interdisciplinar.
            </p>
          </div>

          <div className="space-y-8">
            {storyParts.map((part, index) => (
              <div
                key={part.title}
                className={`rounded-[28px] p-6 md:p-8 border shadow-sm hover:shadow-md transition-all duration-300 ${
                  index % 2 === 0
                    ? 'bg-brand-yellow/10 border-brand-yellow/30'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-brand-blue text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                    {index + 1}
                  </div>
                  <h3 className="text-2xl md:text-[28px] font-bold text-gray-900 leading-tight">{part.title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 md:gap-8 items-start">
                  <div className="w-full">
                    <div className="overflow-hidden rounded-2xl shadow-sm border border-white/40 bg-white">
                      <img
                        src={part.image}
                        alt={part.imageAlt}
                        className="w-full h-[320px] sm:h-[380px] md:h-[420px] object-cover object-center"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 text-gray-600 leading-relaxed">
                    {part.content.map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-brand-blue rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,_#facc15,_transparent_35%)]" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block text-sm uppercase tracking-[0.2em] text-blue-200 mb-3">
                  Nosso compromisso
                </span>
                <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                  Mais do que um espaço,
                  <br />
                  uma rede de cuidado
                </h3>
              </div>

              <div>
                <p className="text-blue-100 leading-relaxed text-lg">
                  A Casa Amarela é o resultado da união entre conhecimento técnico, trabalho interdisciplinar,
                  acolhimento genuíno e compromisso com o desenvolvimento infantil. Aqui, cada história importa,
                  cada família é acolhida e cada criança é acompanhada com olhar atento, respeito e amor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Missão Visão */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-brand-blue text-white rounded-3xl p-8 md:p-10 h-full shadow-sm">
              <div className="w-14 h-14 bg-brand-yellow rounded-2xl flex items-center justify-center mb-5">
                <FiTarget size={24} className="text-brand-blue" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">Missão</h3>
              <p className="text-blue-200 leading-relaxed">
                Promover o desenvolvimento de cada criança de forma única e integrada, unindo ciência, afeto e
                diferentes especialidades em um cuidado interdisciplinar que acolhe, orienta e transforma a
                jornada das famílias.
              </p>
            </div>

            <div className="bg-brand-yellow rounded-3xl p-8 md:p-10 h-full shadow-sm">
              <div className="w-14 h-14 bg-brand-blue rounded-2xl flex items-center justify-center mb-5">
                <FiEye size={24} className="text-brand-yellow" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-brand-blue mb-3">Visão</h3>
              <p className="text-brand-blue-dark leading-relaxed">
                Ser reconhecida como um espaço onde diferentes saberes se conectam para transformar o
                desenvolvimento infantil, criando um novo padrão de cuidado baseado em integração, ciência e
                acolhimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nossos Valores</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Os princípios que orientam nossa forma de cuidar, trabalhar em equipe e construir relações de
              confiança com cada criança e cada família.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-16 h-16 bg-brand-yellow/20 rounded-2xl flex items-center justify-center mb-5">
                  <Icon size={26} className="text-brand-blue" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-brand-yellow/10 border-t border-brand-yellow/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Conheça nossa equipe</h2>
          <p className="text-gray-600 mb-6">
            Profissionais apaixonados e qualificados, prontos para fazer a diferença.
          </p>
          <Link
            to={ROUTES.TEAM}
            className="inline-flex items-center gap-2 bg-brand-blue text-white font-semibold px-8 py-3 rounded-xl hover:bg-brand-blue-dark transition-all shadow-sm hover:shadow-md"
          >
            Ver Nossa Equipe
          </Link>
        </div>
      </section>
    </div>
  )
}