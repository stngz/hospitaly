import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';

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

  const handleDetectedUrl = (scannedText: string) => {
    const trimmed = scannedText.trim();
    // Match /r/{token} pattern or bare token
    const pathMatch = trimmed.match(/\/r\/([a-zA-Z0-9_-]+)/);
    const tokenMatch = pathMatch ? pathMatch[1] : trimmed;

    // Stop camera stream immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (onNavigateToToken) {
      onNavigateToToken(tokenMatch);
    } else {
      window.location.href = `/r/${tokenMatch}`;
    }
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
                handleDetectedUrl(barcodes[0].rawValue);
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
                handleDetectedUrl(code.data);
                return;
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
  }, []);

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between text-white">
      {/* Top Bar with Close */}
      <div className="w-full flex items-center justify-between p-4 z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-400" />
          <span className="font-serif text-lg tracking-wide">Scan Room QR</span>
        </div>
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
          <div className="max-w-xs mx-auto text-center p-6 bg-stone-900 border border-stone-800 rounded-2xl space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg text-white">Camera Access Needed</h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              {errorMessage || 'Allow camera access in your browser, or open your phone’s Camera app and point it at the QR card in your room.'}
            </p>
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs cursor-pointer"
            >
              Back to Home
            </button>
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
            <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 border-2 border-amber-400/80 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-3xl relative">
                {/* Corner Accents */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />
                {/* Subtle scanning laser line */}
                <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="w-full p-6 text-center z-10 bg-gradient-to-t from-black/90 to-transparent">
        <p className="text-xs text-stone-300 max-w-xs mx-auto">
          Point your camera at the QR code card on the desk or bedside table in your room.
        </p>
      </div>
    </div>
  );
};
