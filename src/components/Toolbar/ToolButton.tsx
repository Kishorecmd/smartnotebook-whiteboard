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
}) => {
  let baseStyles =
    'relative flex items-center justify-center p-3 rounded-2xl transition-all duration-200 select-none touch-target focus:outline-none focus:ring-2 focus:ring-primary-500/50';

  let variantStyles = '';

  if (isDisabled) {
    variantStyles = 'opacity-40 cursor-not-allowed text-slate-500';
  } else if (isActive) {
    variantStyles =
      'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-105 active:scale-95';
  } else {
    switch (variant) {
      case 'primary':
        variantStyles =
          'bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 hover:text-white active:scale-95';
        break;
      case 'danger':
        variantStyles =
          'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 hover:text-white active:scale-95';
        break;
      case 'secondary':
        variantStyles =
          'bg-slate-800/80 text-slate-200 hover:bg-slate-700 active:scale-95';
        break;
      case 'ghost':
      default:
        variantStyles =
          'text-slate-300 hover:bg-slate-800/70 hover:text-white active:scale-95';
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
      <div className="w-6 h-6 flex items-center justify-center pointer-events-none">
        {icon}
      </div>

      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary-500 text-white">
          {badge}
        </span>
      )}
    </button>
  );
};
