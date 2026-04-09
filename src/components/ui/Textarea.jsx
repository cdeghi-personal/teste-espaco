export default function Textarea({ label, error, className = '', rows = 3, disabled, placeholder, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        rows={rows}
        disabled={disabled}
        placeholder={disabled ? '' : placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-vertical
          focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
          disabled:bg-gray-50 disabled:text-gray-500
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
