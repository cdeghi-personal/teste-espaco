import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'

// Renderiza o PDF em <canvas> (via pdfjs-dist, carregado sob demanda) em vez de um
// <iframe> apontando para o visualizador nativo do navegador — isso evita depender
// de parâmetros de URL (#toolbar=0&navpanes=0) que os navegadores modernos podem
// ignorar, e garante que nenhuma barra lateral de miniaturas apareça, já que não há
// UI nativa nenhuma sendo usada.
function PdfCanvasViewer({ blob }) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false
    let pdfDoc = null
    setStatus('loading')

    async function render() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const arrayBuffer = await blob.arrayBuffer()
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const container = containerRef.current
        if (cancelled || !container) return
        container.innerHTML = ''
        const containerWidth = Math.max(container.clientWidth - 32, 300)

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled) return
          const page = await pdfDoc.getPage(pageNum)
          const unscaledViewport = page.getViewport({ scale: 1 })
          const scale = containerWidth / unscaledViewport.width
          const viewport = page.getViewport({ scale })
          const outputScale = window.devicePixelRatio || 1

          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width * outputScale)
          canvas.height = Math.floor(viewport.height * outputScale)
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.className = 'shadow-md bg-white block mx-auto mb-4 rounded'
          container.appendChild(canvas)

          const ctx = canvas.getContext('2d')
          const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
          await page.render({ canvasContext: ctx, viewport, transform }).promise
          if (cancelled) return
        }
        if (!cancelled) setStatus('ready')
      } catch (err) {
        console.error('[PdfCanvasViewer]', err)
        if (!cancelled) setStatus('error')
      }
    }

    render()
    return () => {
      cancelled = true
      if (pdfDoc) pdfDoc.destroy()
    }
  }, [blob])

  return (
    <div className="relative w-full min-h-[60vh]">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          Carregando pré-visualização...
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 text-center px-6">
          Não foi possível exibir a pré-visualização do PDF. Tente novamente.
        </div>
      )}
      <div ref={containerRef} className={`p-4 bg-gray-100 rounded-xl ${status === 'ready' ? '' : 'opacity-0'}`} />
    </div>
  )
}

const VARIANT_CLASSES = {
  ghost: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  primary: 'bg-brand-blue text-white hover:bg-brand-blue-dark',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

// Pré-visualização de PDF reutilizável, parametrizada pelas ações disponíveis no
// rodapé — evita duplicar o modal entre os fluxos de Demonstrativo de Paciente e
// Consultas por Terapeuta, que têm ações diferentes (DRAFT/Faturar vs. só Gerar PDF).
export default function PdfPreviewModal({ title, blob, filename, onClose, actions = [] }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="preview"
      footer={
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          <div className="flex-1" />
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${VARIANT_CLASSES[action.variant || 'primary']}`}
            >
              {action.icon && <action.icon size={14} />}
              {action.loading ? (action.loadingLabel || 'Aguarde...') : action.label}
            </button>
          ))}
        </div>
      }
    >
      <PdfCanvasViewer blob={blob} key={filename} />
    </Modal>
  )
}
