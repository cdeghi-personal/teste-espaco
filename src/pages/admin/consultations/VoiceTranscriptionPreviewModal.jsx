import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Textarea from '../../../components/ui/Textarea'

// Prévia obrigatória antes de aplicar qualquer texto transcrito/revisado ao
// formulário. Nunca aplica sozinha — sempre exige confirmação explícita do
// usuário. Nunca salva o atendimento (só atualiza o estado local via onApply,
// igual a digitar no campo).
export default function VoiceTranscriptionPreviewModal({
  fieldTitle,
  rawTranscript,
  reviewedText,
  reviewFailed,
  initialFieldValue,
  currentFieldValue,
  onApply,
  onClose,
  onRecordAgain,
}) {
  const [editedText, setEditedText] = useState(reviewedText || rawTranscript || '')
  const [showOriginal, setShowOriginal] = useState(false)
  const [replaceConfirming, setReplaceConfirming] = useState(false)

  const trimmedCurrent = (currentFieldValue || '').trim()
  const hasExistingContent = trimmedCurrent.length > 0
  const changedSinceRecording = trimmedCurrent !== (initialFieldValue || '').trim()

  function handleInsertOrAppend() {
    const text = hasExistingContent ? `${currentFieldValue}\n\n${editedText}` : editedText
    onApply(text)
  }

  function handleReplace() {
    if (!replaceConfirming) {
      setReplaceConfirming(true)
      return
    }
    onApply(editedText)
  }

  return (
    <Modal title="Revisar texto transcrito" onClose={onClose} size="lg">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">Campo: <strong className="text-gray-700">{fieldTitle}</strong></p>

        {reviewFailed && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            A transcrição foi concluída, mas a revisão automática não ficou disponível. Você pode revisar o texto original manualmente.
          </div>
        )}

        <Textarea
          label="Texto revisado (editável)"
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          rows={7}
        />

        <div>
          <button
            type="button"
            onClick={() => setShowOriginal(v => !v)}
            className="text-xs text-brand-blue hover:underline"
          >
            {showOriginal ? 'Ocultar transcrição original' : 'Ver transcrição original'}
          </button>
          {showOriginal && (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 whitespace-pre-wrap">
              {rawTranscript || '—'}
            </div>
          )}
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Revise o conteúdo antes de aplicá-lo ao atendimento. A IA pode interpretar incorretamente nomes e termos clínicos.
        </p>

        {changedSinceRecording && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            O campo foi alterado enquanto o áudio era processado. Para não perder o que já foi digitado, só é possível adicionar o texto ao final — ou cancelar.
          </p>
        )}

        {replaceConfirming && (
          <div className="flex items-center justify-between gap-2 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <span className="text-red-700">Tem certeza? O conteúdo atual do campo será substituído.</span>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setReplaceConfirming(false)} className="text-gray-500 hover:underline">Cancelar</button>
              <button type="button" onClick={handleReplace} className="text-red-700 font-semibold hover:underline">Confirmar substituição</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="outline" onClick={onRecordAgain}>Gravar novamente</Button>
        </div>
        <div className="flex items-center gap-2">
          {hasExistingContent && !changedSinceRecording && (
            <Button variant="ghost" onClick={handleReplace} disabled={replaceConfirming}>
              Substituir conteúdo
            </Button>
          )}
          <Button variant="primary" onClick={handleInsertOrAppend} disabled={replaceConfirming}>
            {hasExistingContent ? 'Adicionar ao final' : 'Inserir texto'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
