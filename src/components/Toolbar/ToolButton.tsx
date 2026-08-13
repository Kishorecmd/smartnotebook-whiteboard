import React from 'react';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  badge?: string | number;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  // If true, forces the label to render (for mobile drawers)
  showLabel?: boolean;
}

export const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  isActive = false,
  isDisabled = false,
  badge,
  onClick,
  variant = 'ghost',
  className = '',
  showLabel = false,
}) => {
  let baseStyles =
    'relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200 select-none focus:outline-none min-w-[56px] min-h-[56px] w-[56px] h-[56px] flex-shrink-0';

  let variantStyles = '';

  if (isDisabled) {
    variantStyles = 'opacity-40 cursor-not-allowed text-slate-500';
  } else if (isActive) {
    // Subtle accent surface, bright icon
    variantStyles =
      'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-sm active:scale-95';
  } else {
    switch (variant) {
      case 'primary':
        variantStyles =
          'bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 hover:text-white active:scale-95';
        break;
      case 'danger':
        variantStyles =
          'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 active:scale-95';
        break;
      case 'secondary':
        variantStyles =
          'bg-slate-800/80 text-slate-200 hover:bg-slate-700 active:scale-95 border border-transparent';
        break;
      case 'ghost':
      default:
        variantStyles =
          'text-slate-300 hover:bg-slate-800/80 hover:text-white active:scale-95 border border-transparent';
        break;
    }
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      <div className="flex items-center justify-center pointer-events-none w-6 h-6">
        {icon}
      </div>

      {showLabel && (
        <span className="text-[10px] mt-1 font-medium pointer-events-none truncate max-w-full px-1">
          {label}
        </span>
      )}

      {badge !== undefined && (
        <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold rounded-full bg-primary-500 text-white shadow-sm">
          {badge}
        </span>
      )}
    </button>
  );
};
