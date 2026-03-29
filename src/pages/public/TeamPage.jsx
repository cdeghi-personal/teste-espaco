import { SPECIALTIES } from '../../constants/specialties'

const team = [
  {
    name: 'Dra. Ana Lima',
    specialty: 'PSICOLOGIA',
    credential: 'CRP 06/12345',
    bio: 'Psicóloga clínica com especialização em neuropsicologia infantil e intervenção baseada em ABA. Mais de 8 anos de experiência com TEA e TDAH.',
    formation: 'USP - Universidade de São Paulo',
  },
  {
    name: 'Dr. Carlos Mendes',
    specialty: 'FISIOTERAPIA',
    credential: 'CREFITO 3/12345-F',
    bio: 'Fisioterapeuta especialista em fisioterapia neurológica infantil, com formação em Conceito Bobath e hidroterapia pediátrica.',
    formation: 'UNICAMP',
  },
  {
    name: 'Dra. Beatriz Santos',
    specialty: 'FONOAUDIOLOGIA',
    credential: 'CRFa 2/12345',
    bio: 'Fonoaudióloga com mestrado em linguagem e comunicação. Especialista em CAA (Comunicação Aumentativa e Alternativa) e TEA.',
    formation: 'UNIFESP',
  },
  {
    name: 'Dra. Mariana Costa',
    specialty: 'TO',
    credential: 'CREFITO 3/67890-TO',
    bio: 'Terapeuta ocupacional especializada em integração sensorial (SI) e reabilitação pediátrica. Formação internacional em Denver Model.',
    formation: 'PUC-SP',
  },
]

export default function TeamPage() {
  return (
<div>
	  <section className="bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white overflow-hidden">
		<div className="max-w-6xl mx-auto px-4 sm:px-6">
      
		  <div className="grid grid-cols-1 lg:grid-cols-5 items-stretch min-h-[320px]">
        
			{/* TEXTO */}
			<div className="lg:col-span-2 py-16 flex flex-col justify-center">
			  <h1 className="text-4xl md:text-5xl font-bold mb-4">
				Nossa Equipe
			  </h1>

			  <p className="text-xl text-blue-200 max-w-sm leading-relaxed">
				Profissionais apaixonados, altamente qualificados e comprometidos com o desenvolvimento de cada criança.
			  </p>
			</div>

			{/* IMAGEM */}
			<div className="hidden lg:block lg:col-span-3 relative">
			  <img
				src="/team-photo.jpg"
				alt="Equipe Espaço Casa Amarela"
				className="absolute inset-0 w-full h-full object-contain object-center"
			  />
			</div>

		  </div>
		</div>
	  </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {team.map((member) => {
              const spec = SPECIALTIES[member.specialty]
              return (
                <div key={member.name} className="border-2 border-gray-100 rounded-3xl p-8 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-6">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0"
                      style={{ backgroundColor: spec.bgColor, color: spec.textColor }}
                    >
                      {member.name.charAt(member.name.lastIndexOf(' ') + 1)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${spec.color}`}>
                        {spec.label}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{member.credential}</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
                    <p className="text-xs text-gray-400">
                      <span className="font-medium text-gray-500">Formação:</span> {member.formation}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-brand-yellow/10 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Faça parte da nossa equipe</h2>
          <p className="text-gray-600 mb-6">Procuramos profissionais apaixonados pelo cuidado infantil. Envie seu currículo!</p>
          <a
            href="mailto:rh@casaamarela.com.br"
            className="inline-flex items-center gap-2 bg-brand-blue text-white font-semibold px-8 py-3 rounded-xl hover:bg-brand-blue-dark transition-all"
          >
            Enviar Currículo
          </a>
        </div>
      </section>
    </div>
  )
}
