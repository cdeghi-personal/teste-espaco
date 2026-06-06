import { useState, useEffect } from 'react'
import { FiAlertTriangle, FiTrash2 } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import { useData } from '../../../context/DataContext'
import { useToast } from '../../../components/ui/Toast'

const SUMMARY_LABELS = {
  consultations: 'Atendimentos',
  consultation_therapists: 'Participações de terapeutas',
  consultation_conflicts: 'Conflitos de agenda',
  consultation_activities: 'Atividades de atendimento',
  consultation_series: 'Séries recorrentes',
  medical_records: 'Prontuários',
  medical_record_exams: 'Exames complementares',
  medical_record_medications: 'Medicamentos',
  medical_record_conducts: 'Condutas terapêuticas',
  prepaid_packages: 'Pacotes pré-pagos',
  prepaid_ledger: 'Movimentações de pacote',
  payment_demonstratives: 'Demonstrativos de pagamento',
  payment_invoices: 'Notas fiscais',
  convenio_reports: 'Relatórios ao convênio',
  report_settings: 'Configurações de relatório',
  specialty_payment_history: 'Histórico de pagamento por especialidade',
  patient_guardians: 'Vínculos com responsáveis',
  patient_specialties: 'Especialidades em atendimento',
  patient_conditions: 'Diagnósticos / comorbidades',
  patient_involved_therapists: 'Terapeutas envolvidos',
  patient_external_therapists: 'Terapeutas externos',
}

export default function PatientCleanupModal({ patient, onClose, onSuccess }) {
  const { getPatientCleanupSummary, cleanupInactivePatientData } = useData()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(null)
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await getPatientCleanupSummary(patient.id)
      if (cancelled) return
      if (result?.error) {
        setSummaryError(result.error)
      } else {
        setSummary(result)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [patient.id])

  const totalRows = summary
    ? Object.entries(SUMMARY_LABELS).reduce((acc, [key]) => acc + (Number(summary[key]) || 0), 0)
    : 0

  async function handleConfirm() {
    setSaving(true)
    const result = await cleanupInactivePatientData(patient.id)
    setSaving(false)
    if (result?.error) {
      toast.show(result.error, 'error')
    } else {
      toast.show(`Dados de "${patient.fullName}" removidos com sucesso.`, 'success')
      onSuccess()
    }
  }

  return (
    <Modal
      title="Limpeza de Dados Transacionais"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={confirm !== 'LIMPAR' || loading || !!summaryError || saving}
          >
            {saving ? <Spinner size="sm" /> : <FiTrash2 size={15} />}
            Limpar dados permanentemente
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <FiAlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800 space-y-1">
            <p className="font-semibold">Esta ação é irreversível.</p>
            <p>Todos os dados transacionais de <strong>{patient.fullName}</strong> serão excluídos permanentemente. O cadastro do paciente permanece inativo no sistema.</p>
            <p className="text-xs text-red-600">Responsáveis, terapeutas, salas e demais cadastros de apoio <strong>não</strong> são afetados.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : summaryError ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">{summaryError}</div>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Registros que serão removidos — total: <span className="text-red-600">{totalRows}</span>
              </p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {Object.entries(SUMMARY_LABELS)
                  .filter(([key]) => Number(summary[key]) > 0)
                  .map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{summary[key]}</span>
                    </div>
                  ))}
                {totalRows === 0 && (
                  <div className="px-3 py-3 text-sm text-gray-400 text-center">Nenhum dado transacional encontrado.</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Para confirmar, digite <strong>LIMPAR</strong> no campo abaixo:
              </label>
              <input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="LIMPAR"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none font-mono tracking-widest"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
