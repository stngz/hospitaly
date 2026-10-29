import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { QRCodeRecord } from '../../types';

export const QR_BASE_URL = 'https://hospitaly.vercel.app/r';

export function buildHouseQRUrl(token: string): string {
  const clean = token.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `${QR_BASE_URL}/${encodeURIComponent(clean)}`;
}

/**
 * Formats the short house label for the centre of the QR code (max 8 characters).
 * Uses `qrLabel` if set by the GM; otherwise uses the house name if <= 8 chars,
 * or derives a clean short code / initials.
 */
export function formatCenterHouseLabel(houseName?: string, qrLabel?: string): string {
  if (qrLabel && qrLabel.trim().length > 0) {
    return qrLabel.trim().toUpperCase().slice(0, 8);
  }
  if (!houseName) return '';
  const cleaned = houseName.trim();
  if (cleaned.length <= 8) {
    return cleaned.toUpperCase();
  }

  // Strip parenthetical descriptors first, e.g. "Suite 1 (Master King)" -> "Suite 1"
  const withoutParens = cleaned.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (withoutParens.length > 0 && withoutParens.length <= 8) {
    return withoutParens.toUpperCase();
  }

  // Common prefix shortenings e.g. "Bedroom 3" -> "BED 3", "Villa Rose" -> "ROSE"
  const bedroomMatch = withoutParens.match(/^bedroom\s+(\d+)/i);
  if (bedroomMatch) {
    return `BED ${bedroomMatch[1]}`.slice(0, 8);
  }
  const firstWord = withoutParens.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 3 && firstWord.length <= 8) {
    return firstWord.toUpperCase();
  }

  // Fallback to initials up to 8 characters
  const initials = withoutParens
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (initials || cleaned.slice(0, 8)).toUpperCase().slice(0, 8);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Renders a QR code (Error Correction Level H, 4-module quiet zone) onto `canvas`
 * with a centered house label covering no more than 18% of width & height,
 * then verifies scannability using `jsQR`.
 * Automatically retries with a smaller label (12%) and then no label if needed.
 */
export async function renderVerifiedQRCanvas(
  canvas: HTMLCanvasElement,
  url: string,
  centerLabel: string,
  pixelSize: number
): Promise<{ verified: boolean; labelRemoved: boolean }> {
  const cleanLabel = centerLabel.trim().toUpperCase().slice(0, 8);
  const candidateRatios = cleanLabel ? [0.175, 0.125, 0] : [0];

  for (const ratio of candidateRatios) {
    await QRCode.toCanvas(canvas, url, {
      errorCorrectionLevel: 'H',
      margin: 4,
      width: pixelSize,
      color: {
        dark: '#0C0A09',
        light: '#FFFFFF',
      },
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { verified: false, labelRemoved: false };
    }

    if (ratio > 0 && cleanLabel) {
      // Strictly <= 18% of QR width and height
      const maxDim = Math.floor(pixelSize * ratio);
      const boxW = maxDim;
      const boxH = Math.floor(maxDim * 0.62);
      const boxX = Math.floor((pixelSize - boxW) / 2);
      const boxY = Math.floor((pixelSize - boxH) / 2);
      const radius = Math.max(4, Math.floor(boxH * 0.24));

      // White rounded rectangle backing
      ctx.save();
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, Math.floor(pixelSize / 160));
      ctx.strokeStyle = '#0C0A09';
      ctx.stroke();

      // Auto-shrink bold label font to fit inside boxW * 0.84
      let fontSize = Math.floor(boxH * 0.54);
      const minFontSize = 7;
      const maxTextWidth = boxW * 0.84;

      while (fontSize > minFontSize) {
        ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif`;
        if (ctx.measureText(cleanLabel).width <= maxTextWidth) {
          break;
        }
        fontSize -= 1;
      }

      ctx.fillStyle = '#0C0A09';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cleanLabel, pixelSize / 2, pixelSize / 2 + fontSize * 0.04);
      ctx.restore();
    }

    // Verify with jsQR that the generated canvas decodes to the exact URL
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (decoded && decoded.data === url) {
      return {
        verified: true,
        labelRemoved: ratio === 0 && Boolean(cleanLabel),
      };
    }
  }

  return {
    verified: false,
    labelRemoved: Boolean(cleanLabel),
  };
}

export interface PrintableCardOptions {
  token: string;
  houseName: string;
  qrLabel?: string;
  propertyName?: string;
  primaryColor?: string;
}

/**
 * Renders the full 85 × 120 mm portrait card at 300 DPI (1004 × 1417 px)
 * and verifies that the embedded QR code decodes back to the exact URL via `jsQR`.
 */
export async function renderPrintableQRCardCanvas(options: PrintableCardOptions): Promise<{
  canvas: HTMLCanvasElement;
  dataUrl: string;
  labelRemoved: boolean;
  verified: boolean;
  url: string;
}> {
  const CARD_W = 1004; // 85 mm at 300 DPI
  const CARD_H = 1417; // 120 mm at 300 DPI
  const QR_SIZE = 708; // ~60 mm at 300 DPI

  const url = buildHouseQRUrl(options.token);
  const centerLabel = formatCenterHouseLabel(options.houseName, options.qrLabel);

  const qrCanvas = document.createElement('canvas');
  const { verified, labelRemoved } = await renderVerifiedQRCanvas(
    qrCanvas,
    url,
    centerLabel,
    QR_SIZE
  );

  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = CARD_W;
  cardCanvas.height = CARD_H;
  const ctx = cardCanvas.getContext('2d')!;

  // 1. Crisp white card background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 2. Thin top accent band in property primary color
  ctx.fillStyle = options.primaryColor || '#1E3A5F';
  ctx.fillRect(0, 0, CARD_W, 18);

  // 3. Subtle thin dark border around the card
  ctx.strokeStyle = '#1C1917';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 28, 36, CARD_W - 56, CARD_H - 64, 32);
  ctx.stroke();

  // 4. Top header: ROCK APARTMENTS (small, letter-spaced)
  const topTitle = (options.propertyName || 'ROCK APARTMENTS')
    .replace(/\s+LUSAKA$/i, '')
    .trim()
    .toUpperCase();
  ctx.fillStyle = '#292524';
  ctx.font = '700 28px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Draw with letter spacing
  const spacedTop = topTitle.split('').join(' ');
  ctx.fillText(spacedTop, CARD_W / 2, 145);

  // 5. Centre: QR (~60 mm wide = 708 px) with house name in the middle
  const qrX = Math.floor((CARD_W - QR_SIZE) / 2);
  const qrY = 210;
  ctx.drawImage(qrCanvas, qrX, qrY, QR_SIZE, QR_SIZE);

  // 6. Under it, big: House name in serif (e.g. house name)
  const displayHouse = options.houseName.trim();
  let houseFontSize = 86;
  const maxHouseWidth = CARD_W - 140;
  while (houseFontSize > 38) {
    ctx.font = `700 ${houseFontSize}px "Cormorant Garamond", Georgia, serif`;
    if (ctx.measureText(displayHouse).width <= maxHouseWidth) {
      break;
    }
    houseFontSize -= 2;
  }
  ctx.fillStyle = '#0C0A09';
  ctx.fillText(displayHouse, CARD_W / 2, 1020);

  // 7. One line: Scan for Wi-Fi, house guide & requests
  ctx.fillStyle = '#44403C';
  ctx.font = '500 31px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Scan for Wi-Fi, house guide & requests', CARD_W / 2, 1125);

  // 8. Divider dot line & Bottom small: No app needed · Works on any phone camera
  ctx.fillStyle = '#78716C';
  ctx.font = '400 24px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('No app needed  ·  Works on any phone camera', CARD_W / 2, 1300);

  return {
    canvas: cardCanvas,
    dataUrl: cardCanvas.toDataURL('image/png'),
    labelRemoved,
    verified,
    url,
  };
}

interface QRCodeProps {
  value: string;
  size?: number;
  houseName?: string;
  qrLabel?: string;
  className?: string;
  alt?: string;
  onScanVerified?: (result: { verified: boolean; labelRemoved: boolean }) => void;
}

export const QRCodeView: React.FC<QRCodeProps> = ({
  value,
  size = 220,
  houseName,
  qrLabel,
  className = '',
  alt = 'House QR Code',
  onScanVerified,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [labelRemoved, setLabelRemoved] = useState(false);

  const fullUrl = buildHouseQRUrl(value);
  const centerLabel = formatCenterHouseLabel(houseName, qrLabel);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Render at 2x resolution for crisp Retina display & reliable jsQR verification
    const renderPx = Math.max(size * 2, 360);
    renderVerifiedQRCanvas(canvas, fullUrl, centerLabel, renderPx).then((res) => {
      if (!active) return;
      setLabelRemoved(res.labelRemoved);
      onScanVerified?.(res);
    });

    return () => {
      active = false;
    };
  }, [fullUrl, centerLabel, size]);

  return (
    <div className={`inline-flex flex-col items-center max-w-full ${className}`}>
      <canvas
        ref={canvasRef}
        aria-label={alt}
        style={{ width: size, maxWidth: '100%', height: 'auto' }}
        className="block bg-white rounded-lg aspect-square"
      />
      {labelRemoved && (
        <span className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          Label removed so the code scans reliably
        </span>
      )}
    </div>
  );
};

export interface QRPlaqueModalProps {
  roomId?: string;
  roomNumber: string;
  token: string;
  propertyName: string;
  primaryColor?: string;
  onClose: () => void;
  onRegenerate?: () => QRCodeRecord | null | Promise<QRCodeRecord | null> | void;
}

export const QRPlaqueModal: React.FC<QRPlaqueModalProps> = ({
  roomNumber,
  token,
  propertyName,
  primaryColor,
  onClose,
  onRegenerate,
}) => {
  const [cardImg, setCardImg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsVerifying(true);
    renderPrintableQRCardCanvas({
      token,
      houseName: roomNumber,
      propertyName,
      primaryColor,
    }).then((res) => {
      if (!active) return;
      setCardImg(res.dataUrl);
      setIsVerifying(false);
    });
    return () => {
      active = false;
    };
  }, [token, roomNumber, propertyName, primaryColor]);

  const handleDownloadPng = () => {
    if (!cardImg) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.download = `QR-Card-${roomNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    link.href = cardImg;
    link.click();
    setDownloading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl my-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">House QR Plaque</h3>
            <p className="text-xs text-stone-400">85 × 120 mm print-ready card</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Card Preview Container */}
        <div className="relative bg-white rounded-2xl p-2 shadow-inner overflow-hidden border border-stone-200">
          {isVerifying || !cardImg ? (
            <div className="aspect-[85/120] w-full flex items-center justify-center text-xs text-stone-500">
              Generating 300 DPI card...
            </div>
          ) : (
            <img
              src={cardImg}
              alt={`QR Card for ${roomNumber}`}
              className="w-full aspect-[85/120] object-contain rounded-xl"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!cardImg || downloading}
            className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Download PNG (300 DPI)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium border border-stone-700 transition-all cursor-pointer"
          >
            Print Card
          </button>
        </div>

        {/* Regenerate Token Option */}
        {onRegenerate && (
          <div className="pt-2 border-t border-stone-800/80">
            {confirmRegen ? (
              <div className="space-y-2 p-2.5 rounded-xl bg-red-950/40 border border-red-900/50 text-left">
                <p className="text-[11px] text-red-300">
                  Are you sure? Any physically printed cards will stop working immediately.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmRegen(false)}
                    className="flex-1 py-1.5 rounded-lg border border-stone-700 text-stone-300 text-xs"
                  >
                    Keep current
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRegenerate();
                      setConfirmRegen(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRegen(true)}
                className="w-full text-center text-xs text-stone-400 hover:text-red-400 py-1 transition-colors cursor-pointer"
              >
                Regenerate QR token
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
