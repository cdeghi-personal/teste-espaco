import { useState, useEffect, useRef } from 'react'

const CSS = `
.gr2 { --blue:#2563eb; --blue-dark:#1d4ed8; --blue-light:#eff6ff; --blue-mid:#dbeafe;
  --violet:#7c3aed; --green:#059669; --orange:#d97706; --red:#dc2626;
  --gray-50:#f9fafb; --gray-100:#f3f4f6; --gray-200:#e5e7eb;
  --gray-400:#9ca3af; --gray-600:#4b5563; --gray-700:#374151; --gray-900:#111827;
  --shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06);
  --shadow-lg:0 4px 6px rgba(0,0,0,.07),0 16px 48px rgba(0,0,0,.1);
}
.gr2 { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:var(--gray-900); }
.gr2 .hero {
  background:linear-gradient(135deg,#f0f7ff 0%,#faf5ff 50%,#f0fdf4 100%);
  padding:56px 24px 48px; text-align:center; position:relative; overflow:hidden;
  border-radius:20px; margin-bottom:32px;
}
.gr2 .hero::before {
  content:''; position:absolute; top:-60px; left:50%; transform:translateX(-50%);
  width:500px; height:500px; border-radius:50%;
  background:radial-gradient(circle,rgba(37,99,235,.06) 0%,transparent 70%);
  pointer-events:none;
}
.gr2 .hero-badge {
  display:inline-flex; align-items:center;
  background:var(--blue-light); border:1px solid var(--blue-mid);
  color:var(--blue); font-size:12px; font-weight:600;
  padding:5px 14px; border-radius:99px; margin-bottom:16px; letter-spacing:.3px;
}
.gr2 .hero h1 {
  font-size:clamp(24px,4vw,40px); font-weight:800; color:var(--gray-900);
  line-height:1.15; margin-bottom:12px; letter-spacing:-.5px;
}
.gr2 .hero h1 span { color:var(--blue); }
.gr2 .hero p { font-size:16px; color:var(--gray-600); max-width:520px; margin:0 auto 28px; line-height:1.65; }
.gr2 .hero-stats { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.gr2 .stat-chip {
  background:white; border:1px solid var(--gray-200);
  border-radius:12px; padding:10px 18px;
  display:flex; align-items:center; gap:10px; box-shadow:var(--shadow);
}
.gr2 .stat-chip .num { font-size:20px; font-weight:800; color:var(--blue); }
.gr2 .stat-chip .lbl { font-size:11px; color:var(--gray-600); line-height:1.3; text-align:left; }
.gr2 .tabs-header {
  display:flex; background:var(--gray-100); border-radius:12px; padding:4px;
  width:fit-content; margin:0 auto 36px;
}
.gr2 .tab-btn {
  padding:9px 24px; border-radius:9px; font-size:14px; font-weight:600;
  cursor:pointer; border:none; background:transparent; color:var(--gray-600); transition:all .2s;
}
.gr2 .tab-btn.active { background:white; color:var(--blue); box-shadow:0 1px 4px rgba(0,0,0,.12); }
.gr2 .sec { padding:0 0 48px; max-width:1060px; margin:0 auto; }
.gr2 .sec-title {
  font-size:20px; font-weight:800; color:var(--gray-900);
  margin-bottom:4px; display:flex; align-items:center; gap:8px;
}
.gr2 .sec-sub { font-size:13px; color:var(--gray-600); margin-bottom:24px; }
.gr2 .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
.gr2 .card {
  background:white; border:1px solid var(--gray-200); border-radius:16px; padding:22px;
  box-shadow:var(--shadow); transition:all .2s;
  opacity:0; transform:translateY(14px);
  animation:gr2FadeUp .4s forwards;
}
.gr2 .card:hover { box-shadow:var(--shadow-lg); transform:translateY(-2px); border-color:var(--blue-mid); }
@keyframes gr2FadeUp { to { opacity:1; transform:translateY(0); } }
.gr2 .card-icon {
  width:42px; height:42px; border-radius:11px;
  display:flex; align-items:center; justify-content:center;
  font-size:19px; margin-bottom:12px; flex-shrink:0;
}
.gr2 .card-title { font-size:14px; font-weight:700; color:var(--gray-900); margin-bottom:5px; }
.gr2 .card-desc { font-size:13px; color:var(--gray-600); line-height:1.6; }
.gr2 .tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:12px; }
.gr2 .tag { font-size:11px; font-weight:500; padding:3px 8px; border-radius:99px; background:var(--gray-100); color:var(--gray-700); }
.gr2 .tag.blue { background:var(--blue-light); color:var(--blue); }
.gr2 .tag.green { background:#d1fae5; color:var(--green); }
.gr2 .tag.violet { background:#ede9fe; color:var(--violet); }
.gr2 .tag.orange { background:#fef3c7; color:var(--orange); }
.gr2 .highlight {
  background:linear-gradient(135deg,var(--blue),#4f46e5); color:white;
  border-radius:16px; padding:28px 32px; margin:32px 0;
  display:flex; align-items:flex-start; gap:18px;
}
.gr2 .highlight .hi { font-size:32px; flex-shrink:0; margin-top:2px; }
.gr2 .highlight h3 { font-size:17px; font-weight:700; margin-bottom:5px; }
.gr2 .highlight p { font-size:13px; opacity:.85; line-height:1.65; }
.gr2 .highlight ul { margin-top:8px; padding-left:16px; font-size:13px; opacity:.9; }
.gr2 .highlight ul li { margin-bottom:3px; }
.gr2 .flow-wrap { background:var(--gray-50); border-radius:16px; padding:18px 22px; margin:16px 0; }
.gr2 .flow-step { display:flex; gap:14px; align-items:flex-start; padding:12px 0; border-bottom:1px solid var(--gray-100); }
.gr2 .flow-step:last-child { border-bottom:none; }
.gr2 .step-num {
  width:28px; height:28px; border-radius:50%; flex-shrink:0;
  background:var(--blue); color:white; font-size:12px; font-weight:700;
  display:flex; align-items:center; justify-content:center; margin-top:2px;
}
.gr2 .step-title { font-size:13px; font-weight:700; color:var(--gray-900); margin-bottom:2px; }
.gr2 .step-desc { font-size:13px; color:var(--gray-600); line-height:1.55; }
.gr2 .status-flow { display:flex; flex-wrap:wrap; align-items:center; gap:5px; padding:14px; background:var(--gray-50); border-radius:12px; margin:10px 0; }
.gr2 .sp { padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; }
.gr2 .sp-arr { color:var(--gray-400); font-size:13px; }
.gr2 .sp.red { background:#fee2e2; color:var(--red); }
.gr2 .sp.yellow { background:#fef3c7; color:var(--orange); }
.gr2 .sp.blue { background:var(--blue-mid); color:var(--blue); }
.gr2 .sp.indigo { background:#e0e7ff; color:#4338ca; }
.gr2 .sp.green { background:#d1fae5; color:var(--green); }
.gr2 .sp.orange { background:#ffedd5; color:#c2410c; }
.gr2 .mockup { background:var(--gray-50); border:1px solid var(--gray-200); border-radius:14px; padding:18px; margin:14px 0; font-size:13px; }
.gr2 .mockup-bar { display:flex; align-items:center; gap:7px; background:white; border:1px solid var(--gray-200); border-radius:8px; padding:9px 12px; margin-bottom:10px; }
.gr2 .mock-dot { width:8px; height:8px; border-radius:50%; }
.gr2 .mockup-row { display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:white; border-radius:7px; border:1px solid var(--gray-100); margin-bottom:5px; font-size:12px; color:var(--gray-700); }
.gr2 .divider { height:1px; background:var(--gray-100); margin:0 0 40px; max-width:1060px; }
.gr2 .admin-banner {
  background:linear-gradient(135deg,#1e1b4b,#312e81); color:white;
  border-radius:16px; padding:28px 32px; margin-bottom:32px;
  display:flex; gap:18px; align-items:flex-start;
}
.gr2 .admin-banner .abi { font-size:32px; flex-shrink:0; }
.gr2 .admin-banner h3 { font-size:17px; font-weight:700; margin-bottom:5px; }
.gr2 .admin-banner p { font-size:13px; opacity:.8; line-height:1.6; }
.gr2 .panel { display:none; }
.gr2 .panel.active { display:block; }

/* ── Imagens de seção ── */
.gr2 .sec-img-wrap {
  margin: 0 0 28px; border-radius: 16px; overflow: hidden;
  border: 1px solid var(--gray-200); box-shadow: 0 4px 24px rgba(0,0,0,.10);
  background: var(--gray-50);
}
.gr2 .sec-img-wrap img {
  width: 100%; display: block;
  border-radius: 0;
}
.gr2 .mini-imgs {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 0 0 28px;
}
@media (max-width: 700px) {
  .gr2 .mini-imgs { grid-template-columns: repeat(2, 1fr); }
}
.gr2 .mini-img-item { display: flex; flex-direction: column; gap: 6px; }
.gr2 .mini-img-item img {
  width: 100%; border-radius: 10px; border: 1px solid var(--gray-200);
  box-shadow: 0 1px 8px rgba(0,0,0,.09); display: block;
}
.gr2 .mini-img-label {
  text-align: center; font-size: 11px; color: var(--gray-400); font-weight: 500;
}

/* ── Layout split: imagem esquerda + cards direita ── */
.gr2 .split-wrap {
  display: flex; gap: 16px; align-items: stretch; margin: 0 0 0;
}
.gr2 .split-img {
  width: 50%; flex-shrink: 0; border-radius: 14px; overflow: hidden;
  border: 1px solid var(--gray-200); box-shadow: 0 4px 24px rgba(0,0,0,.10);
}
.gr2 .split-img img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.gr2 .split-cards {
  flex: 1; display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
}
.gr2 .split-cards .card {
  margin: 0; padding: 16px;
}
@media (max-width: 768px) {
  .gr2 .split-wrap { flex-direction: column; }
  .gr2 .split-img { width: 100%; }
  .gr2 .split-cards { grid-template-rows: auto; }
  .gr2 .split-cards-col { grid-template-rows: auto; }
}

/* layout invertido: cards esquerda, imagem direita */
.gr2 .split-wrap.rev { flex-direction: row-reverse; }
@media (max-width: 768px) {
  .gr2 .split-wrap.rev { flex-direction: column; }
}

/* coluna única de cards (para 3 cards) */
.gr2 .split-cards-col {
  flex: 1; display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
}
.gr2 .split-cards-col .card { margin: 0; padding: 16px; }
`

function Card({ icon, bg, title, desc, tags = [], delay = 0, style = {} }) {
  return (
    <div className="card" style={{ animationDelay: `${delay}s`, animationPlayState: 'paused', ...style }}>
      <div className="card-icon" style={{ background: bg }}>{icon}</div>
      <div className="card-title">{title}</div>
      <div className="card-desc">{desc}</div>
      {tags.length > 0 && (
        <div className="tags">
          {tags.map(([label, color]) => <span key={label} className={`tag ${color}`}>{label}</span>)}
        </div>
      )}
    </div>
  )
}

function Step({ n, title, desc }) {
  return (
    <div className="flow-step">
      <div className="step-num">{n}</div>
      <div>
        <div className="step-title">{title}</div>
        <div className="step-desc">{desc}</div>
      </div>
    </div>
  )
}

function SectionImage({ src, alt }) {
  return (
    <div className="sec-img-wrap">
      <img src={src} alt={alt} loading="lazy" />
    </div>
  )
}

export default function GuidePageV2() {
  const [tab, setTab] = useState('terapeuta')
  const rootRef = useRef(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'guide-page-v2-css'
    el.textContent = CSS
    document.head.appendChild(el)
    return () => document.getElementById('guide-page-v2-css')?.remove()
  }, [])

  useEffect(() => {
    if (!rootRef.current) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.style.animationPlayState = 'running' })
    }, { threshold: 0.08 })
    rootRef.current.querySelectorAll('.card').forEach(c => obs.observe(c))
    return () => obs.disconnect()
  }, [tab])

  return (
    <div ref={rootRef} className="gr2 p-3 md:p-6">

      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">✦ Sistema de Gestão Clínica</div>
        <h1>Tudo que você precisa<br />para <span>cuidar melhor</span></h1>
        <p>Do agendamento ao relatório de convênio — uma plataforma completa criada especialmente para a equipe do Espaço Casa Amarela.</p>
        <div className="hero-stats">
          {[['11', 'módulos\nintegrados'], ['IA', 'sugestão de texto\npara convênio'], ['PDF', 'relatórios prontos\npara download'], ['1 ano', 'histórico de\nauditoria']].map(([num, lbl]) => (
            <div key={num} className="stat-chip">
              <div className="num">{num}</div>
              <div className="lbl" style={{ whiteSpace: 'pre-line' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-header">
        <button className={`tab-btn${tab === 'terapeuta' ? ' active' : ''}`} onClick={() => setTab('terapeuta')}>🩺 Para Terapeutas</button>
        <button className={`tab-btn${tab === 'admin' ? ' active' : ''}`} onClick={() => setTab('admin')}>🛡️ Para Administradores</button>
      </div>

      {/* ── PAINEL TERAPEUTA ── */}
      <div className={`panel${tab === 'terapeuta' ? ' active' : ''}`}>

        {/* Agenda */}
        <div className="sec">
          <p className="sec-title">📅 Agenda Semanal</p>
          <p className="sec-sub">Visualize e gerencie todos os atendimentos da semana em uma tela só.</p>
          <SectionImage src="/Tela_Agenda.png" alt="Tela da Agenda Semanal" />
          <div className="grid">
            <Card delay={0.05} icon="📅" bg="#eff6ff" title="Visão semanal completa" desc="Seis colunas (Seg–Sex + Sáb/Dom) com atendimentos organizados por dia e horário. No celular, abas por dia." tags={[['Desktop e mobile', 'blue']]} />
            <Card delay={0.10} icon="✏️" bg="#f0fdf4" title="Crie e edite na hora" desc="Novo atendimento ou edição com um clique direto na agenda. Campos de paciente, terapeuta, especialidade, horário e sala." tags={[['Rápido', 'green']]} />
            <Card delay={0.15} icon="🎨" bg="#faf5ff" title="Legenda por terapeuta" desc="Cada terapeuta tem uma cor própria. A legenda inferior mostra o nome completo de cada profissional." />
            <Card delay={0.20} icon="🔍" bg="#fff7ed" title={'Filtro "Minha Agenda"'} desc="Terapeutas veem automaticamente apenas seus próprios atendimentos. Administradores têm visão de toda a equipe." tags={[['Personalizado', 'orange']]} />
          </div>
        </div>

        <div className="divider" />

        {/* Pacientes */}
        <div className="sec">
          <p className="sec-title">👥 Gestão de Pacientes</p>
          <p className="sec-sub">Ficha clínica e pessoal completa — tudo em um só lugar.</p>
          <div className="split-wrap">
            <div className="split-img">
              <img src="/Tela_Paciente.png" alt="Tela de Gestão de Pacientes" loading="lazy" />
            </div>
            <div className="split-cards">
              <Card delay={0.05} icon="🗂️" bg="#eff6ff" title="Ficha completa do paciente" desc="Dados pessoais, escola, médico responsável, diagnóstico principal, comorbidades, forma de pagamento, responsáveis e terapeutas externos." tags={[['360°', 'blue']]} />
              <Card delay={0.10} icon="👨‍👩‍👧" bg="#f0fdf4" title="Gerente do Caso + Equipe" desc="Cada paciente tem um Gerente do Caso e pode ter múltiplos terapeutas envolvidos. Todos têm acesso ao paciente." tags={[['Multidisciplinar', 'green']]} />
              <Card delay={0.15} icon="💰" bg="#faf5ff" title="Especialidades com valores" desc="Cada especialidade tem valor separado para o paciente e repasse ao terapeuta — usado automaticamente nos relatórios." tags={[['Financeiro integrado', 'violet']]} />
              <Card delay={0.20} icon="🔍" bg="#fff7ed" title="Busca Avançada + CSV" desc="Filtre por terapeuta, especialidade, diagnóstico, status, forma de pagamento e faixa etária com múltipla seleção. Exporte em CSV." tags={[['Exportação', 'orange']]} />
              <Card delay={0.25} icon="🎂" bg="#f0fdf4" title="Faixas Etárias automáticas" desc="Tags coloridas calculadas em tempo real a partir da data de nascimento. Faixas e cores configuráveis pelo administrador." tags={[['Automático', 'green']]} />
              <Card delay={0.30} icon="⏱️" bg="#eff6ff" title="Últimos 10 atendimentos" desc="A ficha do paciente exibe diretamente os 10 atendimentos mais recentes — sem precisar mudar de tela." tags={[['Tudo na mesma tela', 'blue']]} />
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Atendimentos */}
        <div className="sec">
          <p className="sec-title">📋 Registro de Atendimentos</p>
          <p className="sec-sub">Registre, acompanhe e evolua cada sessão com rigor clínico.</p>
          <SectionImage src="/Atendimentos.png" alt="Tela de Registro de Atendimentos" />
          <div className="grid">
            <Card delay={0.05} icon="📝" bg="#eff6ff" title="Evolução clínica estruturada" desc='Ao marcar "Realizada", os campos Objetivo da Sessão, Relato de Evolução e Objetivo da Próxima Sessão tornam-se obrigatórios.' tags={[['Rigor clínico', 'blue']]} />
            <Card delay={0.10} icon="🏷️" bg="#f0fdf4" title="Status configuráveis" desc="Realizada, Cancelada, Falta… os status são definidos pela clínica. Status automáticos podem ser atribuídos pelo sistema." tags={[['Flexível', 'green']]} />
            <Card delay={0.15} icon="🏢" bg="#fff7ed" title="Sala + Horário" desc="Cada atendimento registra a sala utilizada e o horário exato — essenciais para o relatório de convênio e organização da agenda." tags={[['Gestão de espaço', 'orange']]} />
            <Card delay={0.20} icon="🔒" bg="#faf5ff" title="Controle de acesso" desc="Cada terapeuta edita e exclui apenas os próprios atendimentos. O administrador tem acesso completo a todos os registros." tags={[['Seguro', 'violet']]} />
          </div>
        </div>

        <div className="divider" />

        {/* Prontuário */}
        <div className="sec">
          <p className="sec-title">🏥 Prontuário Clínico</p>
          <p className="sec-sub">O histórico clínico completo do paciente em quatro seções organizadas.</p>
          <SectionImage src="/Tela_Prontuario.png" alt="Tela do Prontuário Clínico" />
          <div className="grid">
            <Card delay={0.05} icon="🧪" bg="#eff6ff" title="Exames Complementares" desc="Registre exames com data, link/anexo e observações. Histórico cronológico completo e editável." />
            <Card delay={0.10} icon="💊" bg="#fff7ed" title="Medicamentos" desc="Controle de medicamentos em uso ou interrompidos, com data de início/fim e observações clínicas." />
            <Card delay={0.15} icon="🎯" bg="#f0fdf4" title="Conduta & Objetivo Terapêutico" desc="Registre a conduta de cada terapeuta com objetivos, datas e status de andamento. Vinculado por especialidade." tags={[['Por terapeuta', 'green']]} />
            <Card delay={0.20} icon="📅" bg="#faf5ff" title="Histórico de Atendimentos" desc="Navegue com filtros de período (Mês -2, Anterior, Corrente, Seguinte ou intervalo personalizado) e filtre por status." tags={[['Filtros avançados', 'violet']]} />
          </div>
          <div className="highlight">
            <div className="hi">⚡</div>
            <div>
              <h3>Ações em lote (admin)</h3>
              <p>Selecione múltiplos atendimentos e altere o status de todos de uma vez — ideal para encerramento de mês ou atualização em massa.</p>
              <ul>
                <li>Checkboxes por atendimento</li>
                <li>Botões de status dinâmicos (todos os status ativos)</li>
                <li>Operação em massa com confirmação</li>
              </ul>
            </div>
          </div>
          <div className="card" style={{ animationPlayState: 'running', opacity: 1, transform: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div className="card-icon" style={{ background: '#eff6ff', margin: 0 }}>📄</div>
              <div className="card-title" style={{ margin: 0 }}>PDF do Prontuário (admin)</div>
            </div>
            <div className="card-desc">Gere o prontuário clínico completo em PDF com um clique — exames, medicamentos, conduta e histórico, com cabeçalho da clínica e dados da empresa.</div>
          </div>
        </div>

        <div className="divider" />

        {/* Relatórios */}
        <div className="sec">
          <p className="sec-title">📊 Relatórios em PDF</p>
          <p className="sec-sub">Relatórios prontos para download, com valores e totalizadores automáticos.</p>

          {/* 4 mini prints lado a lado */}
          <div className="mini-imgs">
            <div className="mini-img-item">
              <img src="/Print_Relatorio_Paciente.png" alt="Relatório por Paciente" loading="lazy" />
              <div className="mini-img-label">Consultas por Paciente</div>
            </div>
            <div className="mini-img-item">
              <img src="/Print_Relatorio_Terapeuta.png" alt="Relatório por Terapeuta" loading="lazy" />
              <div className="mini-img-label">Consultas por Terapeuta</div>
            </div>
            <div className="mini-img-item">
              <img src="/Print_Relatorio_Convenio.png" alt="Relatório de Convênio" loading="lazy" />
              <div className="mini-img-label">Relatório ao Convênio</div>
            </div>
            <div className="mini-img-item">
              <img src="/Print_Lista_Presenca.png" alt="Lista de Presença" loading="lazy" />
              <div className="mini-img-label">Lista de Presença</div>
            </div>
          </div>

          <div className="grid">
            <Card delay={0.05} icon="👤" bg="#eff6ff" title="Consultas por Paciente" desc="Lista atendimentos do paciente no período com data, especialidade, terapeuta e valor cobrado. Totalizadores no rodapé." tags={[['Somente admin', 'blue']]} />
            <Card delay={0.10} icon="👩‍⚕️" bg="#f0fdf4" title="Consultas por Terapeuta" desc="Lista atendimentos com valor de repasse por especialidade. Terapeutas veem apenas o próprio relatório — pré-preenchido automaticamente." tags={[['Disponível para terapeutas', 'green']]} />
            <Card delay={0.15} icon="🗓️" bg="#faf5ff" title="Filtros de período" desc="Mês específico ou intervalo personalizado. Combine com filtro de status de múltipla seleção, incluindo status automáticos." tags={[['Flexível', 'violet']]} />
          </div>

          <p className="sec-title" style={{ fontSize: 17, marginTop: 32 }}>📄 Relatório de Convênio</p>
          <p className="sec-sub">Relatório ao Convênio e Lista de Presença — prontos para envio ao plano de saúde.</p>

          <div className="mockup">
            <div className="mockup-bar">
              <div className="mock-dot" style={{ background: '#ef4444' }} />
              <div className="mock-dot" style={{ background: '#f59e0b' }} />
              <div className="mock-dot" style={{ background: '#22c55e' }} />
              <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>Relatório de Convênio — Espaço Casa Amarela</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 7 }}>
              <div className="mockup-row"><span>👤 Paciente</span><span style={{ color: '#2563eb' }}>Maria Silva</span></div>
              <div className="mockup-row"><span>🏷️ Especialidade</span><span style={{ color: '#2563eb' }}>Psicologia</span></div>
              <div className="mockup-row"><span>📅 Período</span><span>Abril/2025</span></div>
              <div className="mockup-row"><span>💰 Total</span><span style={{ color: '#059669' }}>R$ 1.200,00</span></div>
            </div>
            <div className="mockup-row">
              <span>⚡ Sugestão com IA</span>
              <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>Gerar texto automaticamente</span>
            </div>
          </div>

          <div className="flow-wrap">
            <Step n="1" title="Seleção" desc={`Escolha paciente, especialidade e período. Clique em "Buscar Atendimentos" — as sessões são carregadas automaticamente do histórico.`} />
            <Step n="2" title="Revisão das sessões" desc={`Adicione, remova ou ajuste datas, horários e valores individualmente. Use "aplicar a todas" para padronizar rapidamente.`} />
            <Step n="3" title="Texto do Relatório" desc='Preencha diagnóstico (com CID), encaminhamento, objetivos e desempenho. Ou clique em ⚡ Sugerir com IA para gerar um texto baseado nos relatos reais das sessões.' />
            <Step n="4" title="Pré-visualizar e Baixar" desc="Visualize o PDF completo antes de baixar. Ao confirmar, o relatório é registrado no histórico com versionamento automático." />
          </div>

          <div className="grid" style={{ marginTop: 16 }}>
            <Card delay={0.05} icon="🤖" bg="#ede9fe" title="Sugestão com IA (GPT-4o)" desc="Analisa os relatos reais de evolução das sessões e gera um texto coeso para desempenho e objetivos — sem copiar e colar." tags={[['Inteligência Artificial', 'violet']]} />
            <Card delay={0.10} icon="📜" bg="#f0fdf4" title="Versionamento automático" desc="Cada PDF gerado é registrado com data, hora e versão. Se precisar re-gerar, os dados anteriores ficam salvos e podem ser restaurados." tags={[['Histórico completo', 'green']]} />
            <Card delay={0.15} icon="🖋️" bg="#fff7ed" title="Lista de Presença" desc="Além do relatório, gera a Lista de Presença com colunas para data, valor, local, horário e assinatura — pronto para apresentação ao convênio." tags={[['Dois PDFs', 'orange']]} />
          </div>
        </div>

        <div className="divider" />

        {/* Suporte */}
        <div className="sec">
          <p className="sec-title">🎫 Suporte ao Usuário</p>
          <p className="sec-sub">Canal direto com a equipe de administração — dentro do próprio sistema.</p>
          <div className="split-wrap rev">
            <div className="split-img">
              <img src="/Tela_Suporte.png" alt="Tela de Suporte ao Usuário" loading="lazy" />
            </div>
            <div className="split-cards-col">
              <Card delay={0.05} icon="✉️" bg="#eff6ff" title="Abra chamados facilmente" desc="Registre Erros, Dúvidas ou sugestões de Melhoria. Acompanhe o andamento sem precisar de e-mail ou WhatsApp." />
              <Card delay={0.10} icon="🔔" bg="#fef3c7" title="Notificação de resposta" desc="Quando o administrador registrar uma solução, seu chamado fica destacado em âmbar e um banner no dashboard avisa para você verificar." tags={[['Notificação visual', 'orange']]} />
              <Card delay={0.15} icon="✅" bg="#f0fdf4" title="Aprovação ou reprovação" desc={<>Ao receber uma resposta, você decide: <strong>OK com a Resposta</strong> (fecha o chamado) ou <strong>Não OK</strong> (devolve com comentário para nova análise).</>} tags={[['Feedback fechado', 'green']]} />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fluxo do chamado:</p>
            <div className="status-flow">
              <span className="sp red">Novo</span><span className="sp-arr">→</span>
              <span className="sp yellow">Em Análise</span><span className="sp-arr">→</span>
              <span className="sp indigo">Em Desenvolvimento</span><span className="sp-arr">→</span>
              <span className="sp blue">Resolvido</span><span className="sp-arr">→</span>
              <span className="sp green">Fechado</span>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Se a solução não atender: o chamado volta como <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Reprovado pelo Usuário</span> para nova análise.</p>
          </div>
        </div>

      </div>{/* /painel terapeuta */}

      {/* ── PAINEL ADMIN ── */}
      <div className={`panel${tab === 'admin' ? ' active' : ''}`}>

        <div className="sec" style={{ paddingTop: 8 }}>
          <div className="admin-banner">
            <div className="abi">🛡️</div>
            <div>
              <h3>Visão completa do sistema</h3>
              <p>Além de todas as funcionalidades disponíveis para terapeutas, administradores têm acesso a ferramentas de gestão, auditoria, CRM e configuração. Cada módulo abaixo é exclusivo ou expandido para o perfil admin.</p>
            </div>
          </div>

          {/* CRM */}
          <p className="sec-title">📬 CRM de Contatos</p>
          <p className="sec-sub">Gerencie todos os leads que chegam pelo formulário do site público.</p>
          <div className="grid">
            <Card delay={0.05} icon="📥" bg="#eff6ff" title="Captação automática" desc="Todo contato enviado pelo site público aparece automaticamente. Um banner vermelho no dashboard avisa quando há novos contatos aguardando." tags={[['Integrado ao site', 'blue']]} />
            <Card delay={0.10} icon="🔄" bg="#f0fdf4" title="Workflow de status" desc="Acompanhe cada lead: Novo → Em Contato → Agendado → Convertido ou Sem Interesse. Notas internas e responsável por atendimento." tags={[['Pipeline', 'green']]} />
          </div>

          <div className="divider" style={{ marginTop: 32 }} />

          {/* Auditoria */}
          <p className="sec-title">🔐 Log de Auditoria</p>
          <p className="sec-sub">Rastreabilidade completa de todas as ações no sistema.</p>
          <div className="grid">
            <Card delay={0.05} icon="👁️" bg="#faf5ff" title="Registro de toda ação" desc="Inserções, alterações, exclusões e visualizações de prontuários registradas com usuário, data/hora, recurso e nome do registro afetado." tags={[['Conformidade', 'violet']]} />
            <Card delay={0.10} icon="📁" bg="#f0fdf4" title="Retenção em dois níveis" desc="Log ativo dos últimos 90 dias no painel. Arquivo de 90 dias a 1 ano no banco. Manutenção automática via rotina diária — zero trabalho manual." tags={[['1 ano de histórico', 'green']]} />
            <Card delay={0.15} icon="🔍" bg="#eff6ff" title="Filtros avançados" desc="Filtre por usuário (por nome), tipo de ação, recurso, data e texto livre. Paginação de 50 registros por página." tags={[['Investigação fácil', 'blue']]} />
          </div>

          <div className="divider" />

          {/* Configurações */}
          <p className="sec-title">⚙️ Configurações do Sistema</p>
          <p className="sec-sub">Personalize o sistema para a realidade da clínica — sem código.</p>
          <div className="grid">
            <Card delay={0.05} icon="🩺" bg="#eff6ff" title="Especialidades" desc="Gerencie as especialidades oferecidas. Cada uma tem identificador único, nome exibido e pode ser ativada/desativada." />
            <Card delay={0.10} icon="🏷️" bg="#f0fdf4" title="Status de Atendimento" desc='Crie e edite status (Realizada, Cancelada…) com cores personalizadas. Marque como "automático" para uso pelo sistema sem aparecer no formulário.' />
            <Card delay={0.15} icon="🏢" bg="#fff7ed" title="Salas, Tipos e Faixas Etárias" desc="Configure salas de atendimento, tipos de sessão (Individual, Grupo…) e faixas etárias coloridas calculadas automaticamente." />
            <Card delay={0.20} icon="🏭" bg="#faf5ff" title="Dados da Empresa + Prompt da IA" desc="Configure Razão Social e CNPJ exibidos nos PDFs. Customize o prompt enviado à IA para sugestões no relatório de convênio." tags={[['IA customizável', 'violet']]} />
          </div>

          <div className="divider" />

          {/* Terapeutas */}
          <p className="sec-title">👩‍⚕️ Gestão de Terapeutas</p>
          <p className="sec-sub">Cadastro completo com fluxo de convite automático por e-mail.</p>
          <div className="flow-wrap" style={{ marginBottom: 16 }}>
            <Step n="1" title="Cadastro pelo admin" desc="Admin cadastra o terapeuta com nome, e-mail e especialidades. Nenhuma senha é definida nesse momento." />
            <Step n="2" title="Convite automático" desc="O sistema envia automaticamente um e-mail de convite para o terapeuta criar sua própria senha." />
            <Step n="3" title="Primeiro acesso" desc="O terapeuta clica no link, define a senha e já entra no sistema com acesso aos próprios pacientes e agenda." />
          </div>

          <div className="highlight">
            <div className="hi">🔑</div>
            <div>
              <h3>Segurança por design</h3>
              <p>O sistema usa Row Level Security no banco de dados — cada terapeuta só acessa os próprios dados mesmo que tente contornar a interface. Nenhuma regra depende apenas do frontend.</p>
              <ul>
                <li>Terapeutas veem apenas seus pacientes, agendamentos e atendimentos</li>
                <li>Prontuários respeitam o vínculo terapeuta ↔ paciente</li>
                <li>Toda ação fica registrada no log de auditoria por 1 ano</li>
              </ul>
            </div>
          </div>

        </div>
      </div>{/* /painel admin */}

    </div>
  )
}