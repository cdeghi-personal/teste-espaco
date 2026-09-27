import { useEffect, useRef, useState } from 'react'
import { FiMic, FiSquare, FiX } from 'react-icons/fi'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../components/ui/Toast'
import VoiceTranscriptionPreviewModal from './VoiceTranscriptionPreviewModal'

const MAX_SECONDS = 180 // 3 minutos

const CANDIDATE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/webm',
  'audio/ogg;codecs=opus',
]

function pickSupportedMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined' || !window.MediaRecorder.isTypeSupported) return null
  return CANDIDATE_MIME_TYPES.find(t => window.MediaRecorder.isTypeSupported(t)) || null
}

function extensionFor(mimeType) {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

function fmtTimer(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

// Botão de microfone + máquina de estados de gravação/processamento pra um
// campo clínico do ConsultationFormModal. `enabled` já reflete todas as
// condições de permissão calculadas pelo componente pai — este componente só
// cuida da mecânica de gravação/transcrição, nunca decide sozinho se deve
// aparecer.
export default function VoiceClinicalInput({
  fieldKey,
  fieldTitle,
  value,
  consultationId,
  enabled,
  activeFieldKey,
  onActiveChange,
  onApply,
}) {
  const { show } = useToast()
  const [status, setStatus] = useState('idle') // idle | recording | processing
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null) // { rawTranscript, reviewedText, reviewFailed } | null

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const recordStartValueRef = useRef('')
  const abortControllerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
    clearTimerRef()
    stopTracksRef()
    abortControllerRef.current?.abort()
  }, [])

  const mimeType = pickSupportedMimeType()
  const busyElsewhere = !!activeFieldKey && activeFieldKey !== fieldKey

  function clearTimerRef() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }
  function stopTracksRef() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }
  function releaseActive() {
    onActiveChange(prev => (prev === fieldKey ? null : prev))
  }

  async function startRecording() {
    if (!enabled || busyElsewhere || status !== 'idle') return
    setError('')

    if (!mimeType) {
      setError('Seu navegador não oferece suporte à gravação de áudio. Utilize o preenchimento manual.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorderRef.current = recorder
      recordStartValueRef.current = value || ''

      recorder.start()
      onActiveChange(fieldKey)
      setStatus('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          const next = s + 1
          if (next >= MAX_SECONDS) finishRecording()
          return next
        })
      }, 1000)
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.name === 'SecurityError') {
        setError('O acesso ao microfone foi negado. Libere a permissão nas configurações do navegador.')
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setError('Nenhum microfone foi encontrado.')
      } else {
        setError('Não foi possível acessar o microfone. Verifique a permissão do navegador e tente novamente.')
      }
    }
  }

  function finishRecording() {
    clearTimerRef()
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => { stopTracksRef(); processAudio() }
      recorder.stop()
    } else {
      stopTracksRef()
    }
    setStatus('processing')
  }

  function cancelRecording() {
    clearTimerRef()
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    stopTracksRef()
    chunksRef.current = []
    setStatus('idle')
    setSeconds(0)
    releaseActive()
  }

  async function processAudio() {
    const usedMimeType = mediaRecorderRef.current?.mimeType || mimeType || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type: usedMimeType })
    chunksRef.current = []

    if (blob.size === 0) {
      if (mountedRef.current) {
        setStatus('idle')
        setError('Não foi possível transcrever o áudio. Tente novamente.')
      }
      releaseActive()
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const form = new FormData()
    form.append('audio', blob, `gravacao.${extensionFor(usedMimeType)}`)
    form.append('consultationId', consultationId)
    form.append('fieldName', fieldKey)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('transcribe-clinical-audio', {
        body: form,
        signal: controller.signal,
      })
      if (!mountedRef.current) return
      if (fnError) throw new Error(fnError.message || 'Não foi possível transcrever o áudio. Tente novamente.')
      if (data?.error) throw new Error(data.error)

      setStatus('idle')
      setSeconds(0)
      setPreview({
        rawTranscript: data.rawTranscript || '',
        reviewedText: data.reviewedText || null,
        reviewFailed: !!data.reviewFailed,
      })
    } catch (err) {
      if (!mountedRef.current) return
      if (err?.name !== 'AbortError') {
        setStatus('idle')
        setError(err?.message || 'O serviço de transcrição está temporariamente indisponível. Tente novamente mais tarde.')
      } else {
        setStatus('idle')
      }
    } finally {
      abortControllerRef.current = null
      releaseActive()
    }
  }

  function cancelProcessing() {
    abortControllerRef.current?.abort()
  }

  function handleApply(text) {
    onApply(text)
    setPreview(null)
    show('Texto aplicado ao campo.', 'success')
  }

  function handleRecordAgain() {
    setPreview(null)
    startRecording()
  }

  if (!enabled) return null

  return (
    <>
      {status === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          disabled={busyElsewhere || !mimeType}
          title={mimeType ? 'Preencher por voz' : 'Navegador sem suporte à gravação de áudio'}
          aria-label="Preencher por voz"
          className="p-1 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <FiMic size={14} />
        </button>
      )}

      {status === 'recording' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          <span className="text-xs text-red-600 font-medium">Gravando {fmtTimer(seconds)}</span>
          <button type="button" onClick={finishRecording} title="Parar" aria-label="Parar gravação"
            className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <FiSquare size={13} />
          </button>
          <button type="button" onClick={cancelRecording} title="Cancelar" aria-label="Cancelar gravação"
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <FiX size={14} />
          </button>
        </div>
      )}

      {status === 'processing' && (
        <div className="flex items-center gap-1.5 shrink-0" role="status" aria-live="polite">
          <span className="w-3 h-3 rounded-full border-2 border-gray-200 border-t-brand-blue animate-spin" aria-hidden="true" />
          <span className="text-xs text-gray-500">Transcrevendo e revisando o texto...</span>
          <button type="button" onClick={cancelProcessing} title="Cancelar" aria-label="Cancelar processamento"
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <FiX size={14} />
          </button>
        </div>
      )}

      {error && status === 'idle' && (
        <span className="text-xs text-red-600 ml-1" role="alert">{error}</span>
      )}

      {preview && (
        <VoiceTranscriptionPreviewModal
          fieldTitle={fieldTitle}
          rawTranscript={preview.rawTranscript}
          reviewedText={preview.reviewedText}
          reviewFailed={preview.reviewFailed}
          initialFieldValue={recordStartValueRef.current}
          currentFieldValue={value}
          onApply={handleApply}
          onClose={() => setPreview(null)}
          onRecordAgain={handleRecordAgain}
        />
      )}
    </>
  )
}
