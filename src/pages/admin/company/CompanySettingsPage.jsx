import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { FiSave } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { useToast } from '../../../components/ui/Toast'
import { ROUTES } from '../../../constants/routes'

const DEFAULT_AI_PROMPT = `Você é um assistente especializado em relatórios clínicos para convênios de saúde de uma clínica de terapias infantis no Brasil.

Sua tarefa é SINTETIZAR os relatos de múltiplas sessões em três textos coerentes.

INSTRUÇÕES:
- Leia todos os relatos e identifique os temas recorrentes e pontos principais do período
- Escreva uma síntese — não copie frases, não liste sessão por sessão, não concatene os textos
- Agrupe objetivos similares das diferentes sessões em um único item consolidado
- Para o desempenho, destaque padrões de evolução observados ao longo do período, não sessão a sessão
- Mencione apenas o que está presente nos relatos; não use conhecimento externo para preencher lacunas
- Use português brasileiro formal e clínico, sem markdown nem formatação especial`

export default function CompanySettingsPage() {
  const { user } = useAuth()
  const { companySettings, updateCompanySettings } = useData()
  const toast = useToast()
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [aiSystemPrompt, setAiSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    setRazaoSocial(companySettings.razaoSocial || '')
    setCnpj(companySettings.cnpj || '')
    setAiSystemPrompt(companySettings.aiSystemPrompt || '')
  }, [companySettings])

  if (!isAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />

  function formatCnpj(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 14)
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  function handleCnpjChange(e) {
    setCnpj(formatCnpj(e.target.value))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const result = await updateCompanySettings({
      razaoSocial: razaoSocial.trim(),
      cnpj: cnpj.trim(),
      aiSystemPrompt: aiSystemPrompt.trim(),
    })
    setSaving(false)
    if (result?.error) {
      toast.show(result.error)
    } else {
      toast.show('Dados da empresa salvos com sucesso.', 'success')
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none'
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dados da Empresa</h1>
      <p className="text-sm text-gray-500 mb-6">
        Razão Social e CNPJ exibidos no cabeçalho dos PDFs. Prompt da IA usado no Relatório de Convênio.
      </p>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Dados cadastrais */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados Cadastrais</h2>
          <div>
            <label className={labelClass}>Razão Social</label>
            <input
              className={inputClass}
              value={razaoSocial}
              onChange={e => setRazaoSocial(e.target.value)}
              placeholder="Ex: Espaço Casa Amarela Ltda"
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input
              className={inputClass}
              value={cnpj}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
            />
          </div>
        </div>

        {/* Prompt da IA */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prompt da IA — Relatório de Convênio</h2>
            <p className="text-xs text-gray-400 mt-1">
              Instrução enviada à IA ao gerar sugestões de texto no relatório de convênio. Se vazio, usa o prompt padrão do sistema.
            </p>
          </div>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none resize-y font-mono"
            rows={10}
            value={aiSystemPrompt}
            onChange={e => setAiSystemPrompt(e.target.value)}
            placeholder={DEFAULT_AI_PROMPT}
          />
          <button
            type="button"
            onClick={() => setAiSystemPrompt(DEFAULT_AI_PROMPT)}
            className="text-xs text-brand-blue hover:underline"
          >
            Restaurar prompt padrão
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <FiSave size={15} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}