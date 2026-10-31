import React from 'react';

export interface LogoProps {
  className?: string;
  variant?: 'mark' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'onLight' | 'onDark';
  // Backward compatibility alias for light/dark
  light?: boolean;
}

export const DoorMarkSvg: React.FC<{
  className?: string;
  tone?: 'onLight' | 'onDark';
  size?: number | string;
}> = ({ className = '', tone = 'onLight', size = 32 }) => {
  const archColor = tone === 'onDark' ? '#FAF7F0' : '#13233A';
  const doorColor = '#C9A55C';

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Arch: M28 90 L28 46 A22 22 0 0 1 72 46 L72 90 */}
      <path
        d="M28 90 L28 46 A22 22 0 0 1 72 46 L72 90"
        stroke={archColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Gold Door swinging open: M50 26 L66 34 L66 88 L50 90 Z */}
      <path
        d="M50 26 L66 34 L66 88 L50 90 Z"
        fill={doorColor}
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  tone,
  light,
}) => {
  // Respect tone prop; fallback to light flag (light===true -> onLight, light===false -> onDark)
  const effectiveTone: 'onLight' | 'onDark' =
    tone || (light !== undefined ? (light ? 'onLight' : 'onDark') : 'onLight');

  const config = {
    xs: {
      svgSize: 18,
      textSize: 'text-xs',
      gap: 'gap-1.5',
    },
    sm: {
      svgSize: 24,
      textSize: 'text-base',
      gap: 'gap-2',
    },
    md: {
      svgSize: 32,
      textSize: 'text-xl',
      gap: 'gap-2.5',
    },
    lg: {
      svgSize: 40,
      textSize: 'text-2xl',
      gap: 'gap-3',
    },
    xl: {
      svgSize: 52,
      textSize: 'text-3xl sm:text-4xl',
      gap: 'gap-3.5',
    },
  }[size];

  const textColor = effectiveTone === 'onDark' ? 'text-[#FAF7F0]' : 'text-[#13233A]';

  return (
    <div className={`inline-flex items-center ${config.gap} select-none ${className}`}>
      <DoorMarkSvg tone={effectiveTone} size={config.svgSize} />
      {variant === 'full' && (
        <span
          className={`font-serif font-bold tracking-tight leading-none ${config.textSize} ${textColor}`}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700 }}
        >
          Shekin
        </span>
      )}
    </div>
  );
};
