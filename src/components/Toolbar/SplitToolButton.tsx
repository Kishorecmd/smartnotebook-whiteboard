import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SplitToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  isDropdownOpen?: boolean;
  onMainClick: () => void;
  onDropdownClick: () => void;
  className?: string;
}

export const SplitToolButton: React.FC<SplitToolButtonProps> = ({
  icon,
  label,
  isActive = false,
  isDisabled = false,
  isDropdownOpen = false,
  onMainClick,
  onDropdownClick,
  className = '',
}) => {
  const baseWrapper = 'flex items-stretch rounded-2xl transition-all duration-200 select-none min-w-[var(--split-tool-width)] w-[var(--split-tool-width)] h-[var(--tool-size)] border flex-shrink-0';
  
  let variantStyles = '';
  if (isDisabled) {
    variantStyles = 'opacity-40 cursor-not-allowed text-slate-500 border-transparent';
  } else if (isActive) {
    variantStyles = 'bg-primary-500/20 text-primary-300 border-primary-500/30 shadow-sm';
  } else {
    variantStyles = 'text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white';
  }

  return (
    <div className={`${baseWrapper} ${variantStyles} ${className}`}>
      {/* Main Button */}
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={isDisabled}
        onClick={onMainClick}
        className="flex min-w-0 flex-1 items-center justify-center rounded-l-2xl px-2 hover:bg-white/5 active:scale-95 transition-all focus:outline-none"
      >
        <div className="w-6 h-6 flex items-center justify-center pointer-events-none">
          {icon}
        </div>
      </button>

      {/* Divider */}
      <div className="w-px bg-white/10 my-3" />

      {/* Dropdown Chevron */}
      <button
        type="button"
        title={`${label} options`}
        aria-label={`${label} options`}
        disabled={isDisabled}
        onClick={onDropdownClick}
        aria-expanded={isDropdownOpen}
        className={`flex items-center justify-center w-[var(--split-chevron-width)] rounded-r-2xl hover:bg-white/10 active:scale-95 transition-all focus:outline-none ${isDropdownOpen ? 'bg-white/10 text-white' : ''}`}
      >
        <ChevronDown className="w-4 h-4 pointer-events-none" />
      </button>
    </div>
  );
};
