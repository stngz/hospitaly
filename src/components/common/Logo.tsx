import React from 'react';
import { APP_NAME } from '../../lib/config';

interface LogoProps {
  className?: string;
  variant?: 'mark' | 'full';
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  light = false,
}) => {
  const sizeClasses = {
    sm: {
      mark: 'w-7 h-7 text-xs rounded-lg',
      text: 'text-base',
      gap: 'gap-2',
    },
    md: {
      mark: 'w-8 h-8 text-sm rounded-xl',
      text: 'text-lg',
      gap: 'gap-2.5',
    },
    lg: {
      mark: 'w-10 h-10 text-base rounded-2xl',
      text: 'text-2xl',
      gap: 'gap-3',
    },
  }[size];

  const markBg = light
    ? 'bg-stone-950 text-amber-400 shadow-xs'
    : 'bg-[#1C3A31] text-[#E0B973] shadow-xs';

  const textColor = light ? 'text-stone-950' : 'text-white';

  return (
    <div className={`inline-flex items-center ${sizeClasses.gap} ${className}`}>
      {/* Brand Icon Mark */}
      <div
        className={`${sizeClasses.mark} ${markBg} flex items-center justify-center font-serif font-bold select-none shrink-0 transition-transform`}
        aria-hidden="true"
      >
        <span>{APP_NAME.charAt(0)}</span>
      </div>

      {/* Brand Wordmark */}
      {variant === 'full' && (
        <span
          className={`font-serif font-bold ${sizeClasses.text} ${textColor} tracking-tight select-none`}
        >
          {APP_NAME}
        </span>
      )}
    </div>
  );
};
