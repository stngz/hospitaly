import React, { useState } from 'react';
import { Wifi, Copy, Check } from 'lucide-react';

interface WifiCardProps {
  ssid: string;
  password: string;
}

export const WifiCard: React.FC<WifiCardProps> = ({ ssid, password }) => {
  const [copied, setCopied] = useState(false);

  if (!ssid) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-stone-900/[0.07] px-4 py-3.5 shadow-[0_1px_2px_rgba(24,24,22,0.04)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-[38px] h-[38px] rounded-[11px] bg-[#1C3A31]/[0.08] text-[#1C3A31] flex items-center justify-center shrink-0">
          <Wifi className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-stone-500">Wi-Fi · {ssid}</p>
          <p className="text-sm font-semibold text-stone-900 truncate mt-0.5">{password}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-[10px] bg-[#F5F1E8] border border-stone-900/[0.08] px-3 py-2 text-xs font-semibold text-[#1C3A31] active:scale-[0.98] inline-flex items-center gap-1.5"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy password'}
      </button>
    </div>
  );
};
