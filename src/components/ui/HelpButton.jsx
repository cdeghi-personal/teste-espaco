import { useState } from 'react'
import { FiHelpCircle, FiX } from 'react-icons/fi'

export default function HelpButton({ title = 'Como usar esta tela', children }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ajuda"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-brand-blue hover:border-brand-blue transition-colors text-xs font-medium"
      >
        <FiHelpCircle size={15} />
        <span className="hidden sm:inline">Ajuda</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <FiHelpCircle size={18} className="text-brand-blue" />
                <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <FiX size={18} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto text-sm text-gray-700 space-y-3 leading-relaxed">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
