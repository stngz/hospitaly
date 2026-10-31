import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import jsQR from 'jsqr';
import { Logo } from '../brand/Logo';

interface ScanPageProps {
  onClose: () => void;
  onNavigateToToken?: (token: string) => void;
}

export const ScanPage: React.FC<ScanPageProps> = ({ onClose, onNavigateToToken }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // HOTFIX (scanner): only open real Shekin room cards, and only after the same code is
  // read twice in a row. Before, any half-read or foreign QR jumped straight to a broken page.
  const [hint, setHint] = useState<string | null>(null);
  const lastReadRef = useRef<{ token: string; count: number } | null>(null);
  const navigatingRef = useRef(false);

  const extractRoomToken = (scannedText: string): string | null => {
    try {
      const url = new URL(scannedText.trim());
      const host = url.hostname.toLowerCase();
      const allowedHost =
        host === window.location.hostname.toLowerCase() ||
        host === 'hospitaly.vercel.app' ||
        host === 'shekin.app' ||
        host.endsWith('.shekin.app');
      const match = url.pathname.match(/^\/r\/([a-zA-Z0-9_-]{6,})\/?$/);
      if (!allowedHost || !match) return null;
      return match[1];
    } catch {
      return null; // not a full URL -> not one of our cards (or a partial read)
    }
  };

  // Returns true when the scanner should stop (we are opening the house).
  const handleDetectedText = (scannedText: string): boolean => {
    if (navigatingRef.current) return true;
    const token = extractRoomToken(scannedText);
    if (!token) {
      lastReadRef.current = null;
      setHint("That isn't a room card. Point the camera at the QR card in your house.");
      return false;
    }
    const last = lastReadRef.current;
    lastReadRef.current = last && last.token === token ? { token, count: last.count + 1 } : { token, count: 1 };
    if (lastReadRef.current.count < 2) return false; // wait for a second identical read

    navigatingRef.current = true;
    setHint('Opening your house…');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Full page load so the guest screen always starts clean
    window.location.assign(`/r/${token}`);
    return true;
  };

  useEffect(() => {
    let isCancelled = false;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        setHasPermission(true);
        startScanning();
      } catch (err: any) {
        if (isCancelled) return;
        setHasPermission(false);
        setErrorMessage(
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'Camera permission denied. Allow camera access or point your phone camera app at the QR card.'
            : 'Could not access camera. Please open your phone camera app to scan the QR card.'
        );
      }
    }

    function startScanning() {
      // Use BarcodeDetector if available natively, else fall back to jsQR
      const hasBarcodeDetector = 'BarcodeDetector' in window;
      let barcodeDetector: any = null;
      if (hasBarcodeDetector) {
        try {
          barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          barcodeDetector = null;
        }
      }

      const scanFrame = async () => {
        if (isCancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                if (handleDetectedText(barcodes[0].rawValue)) return;
                // One read per frame: don't let jsQR count the same frame a second time
                animationFrameRef.current = requestAnimationFrame(scanFrame);
                return;
              }
            } catch {
              // fall back to canvas/jsQR on detector error
            }
          }

          if (canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });
              if (code && code.data) {
                if (handleDetectedText(code.data)) return;
              }
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      };

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }

    void initCamera();

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [retryCount]);

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#13233A] flex flex-col items-center justify-between text-white">
      {/* Top Bar with Close */}
      <div className="w-full flex items-center justify-between p-4 z-10 bg-gradient-to-b from-[#13233A]/90 to-transparent">
        <Logo variant="full" size="sm" tone="onDark" />
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Viewport & Camera Video */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
        {hasPermission === false ? (
          <div className="max-w-xs mx-auto text-center p-6 bg-[#0E1A2B] border border-[#FAF7F0]/15 rounded-3xl space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A55C]/15 text-[#C9A55C] flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg text-white">Camera blocked</h3>
            <p className="text-xs text-[#FAF7F0]/80 leading-relaxed">
              Camera blocked. Allow camera access, or open your phone's camera app and point it at the card.
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FAF7F0] hover:bg-white text-[#13233A] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try again</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl border border-[#FAF7F0]/20 hover:bg-white/10 text-[#FAF7F0] font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Framing Reticle */}
            <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 border-2 border-[#C9A55C]/80 rounded-3xl shadow-[0_0_0_9999px_rgba(19,35,58,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-3xl relative">
                {/* Corner Accents */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#C9A55C] rounded-tl-xl" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#C9A55C] rounded-tr-xl" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#C9A55C] rounded-bl-xl" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#C9A55C] rounded-br-xl" />
                {/* Subtle scanning laser line */}
                <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9A55C] to-transparent animate-pulse" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="w-full p-6 text-center z-10 bg-gradient-to-t from-[#13233A]/90 to-transparent">
        <p className="text-xs text-[#FAF7F0]/80 max-w-xs mx-auto">
          {hint || 'Point your camera at the QR code card on the desk or bedside table in your room.'}
        </p>
      </div>
    </div>
  );
};
