import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { FiSave } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { useToast } from '../../../components/ui/Toast'
import { ROUTES } from '../../../constants/routes'

export default function CompanySettingsPage() {
  const { user } = useAuth()
  const { companySettings, updateCompanySettings } = useData()
  const toast = useToast()
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    setRazaoSocial(companySettings.razaoSocial || '')
    setCnpj(companySettings.cnpj || '')
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
    const result = await updateCompanySettings({ razaoSocial: razaoSocial.trim(), cnpj: cnpj.trim() })
    setSaving(false)
    if (result?.error) {
      toast.show(result.error)
    } else {
      toast.show('Dados da empresa salvos com sucesso.', 'success')
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none'

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dados da Empresa</h1>
      <p className="text-sm text-gray-500 mb-6">
        Razão Social e CNPJ exibidos no cabeçalho de todos os PDFs gerados.
      </p>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Razão Social</label>
          <input
            className={inputClass}
            value={razaoSocial}
            onChange={e => setRazaoSocial(e.target.value)}
            placeholder="Ex: Espaço Casa Amarela Ltda"
            maxLength={200}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ</label>
          <input
            className={inputClass}
            value={cnpj}
            onChange={handleCnpjChange}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div className="flex justify-end pt-2">
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