const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClasses = 'font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    primary: 'bg-[#0B1D3D] text-white hover:bg-[#0a1a35] focus:ring-[#4FC3F7]',
    secondary: 'bg-[#4FC3F7] text-[#0B1D3D] hover:bg-[#3db8ee] focus:ring-[#0B1D3D]',
    outline: 'border-2 border-[#0B1D3D] text-[#0B1D3D] hover:bg-[#0B1D3D] hover:text-white focus:ring-[#4FC3F7]',
    ghost: 'text-[#0B1D3D] hover:bg-gray-100 focus:ring-[#4FC3F7]',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  }

  const widthClass = fullWidth ? 'w-full' : ''

  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      type={type}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${disabledClass}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  )
}

export default Button