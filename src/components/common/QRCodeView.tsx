import React, { useState } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}

export const QRCodeView: React.FC<QRCodeProps> = ({
  value,
  size = 200,
  className = '',
  alt = 'In-Room QR Code',
}) => {
  const [hasError, setHasError] = useState(false);

  // Industry-standard ISO/IEC 18004 camera-scannable QR code generation
  const primaryUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(value)}`;
  const fallbackUrl = `https://quickchart.io/qr?size=${size}&text=${encodeURIComponent(value)}`;

  return (
    <div
      className={`inline-block bg-white p-2.5 rounded-2xl shadow-sm ${className}`}
      style={{ width: size + 20, height: size + 20 }}
    >
      <img
        src={hasError ? fallbackUrl : primaryUrl}
        alt={alt}
        width={size}
        height={size}
        onError={() => setHasError(true)}
        className="block mx-auto rounded-xl w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};
