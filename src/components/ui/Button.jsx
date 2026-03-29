export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  type = 'button',
  onClick,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed gap-2'

  const variants = {
    primary:   'bg-brand-blue text-white hover:bg-brand-blue-dark focus:ring-brand-blue',
    secondary: 'bg-brand-yellow text-brand-blue-dark font-semibold hover:bg-brand-yellow-dark focus:ring-brand-yellow',
    outline:   'border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white focus:ring-brand-blue',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success:   'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
