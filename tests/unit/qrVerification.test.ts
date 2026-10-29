import { describe, it, expect } from 'vitest';
import {
  buildHouseQRUrl,
  formatCenterHouseLabel,
  QR_BASE_URL,
} from '../../src/components/common/QRCodeView';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

describe('QR Utilities and Scan Verification', () => {
  it('constructs correct guest route URL from token', () => {
    const url = buildHouseQRUrl('ROCKSAPA-CHIPO-A1B2');
    expect(url).toBe(`${QR_BASE_URL}/ROCKSAPA-CHIPO-A1B2`);
  });

  it('keeps existing full HTTP/HTTPS URL unmodified', () => {
    const custom = 'https://custom.property.com/r/ABC';
    expect(buildHouseQRUrl(custom)).toBe(custom);
  });

  it('formats center house label to at most 8 uppercase characters', () => {
    expect(formatCenterHouseLabel('Chipo')).toBe('CHIPO');
    expect(formatCenterHouseLabel('Chisenga')).toBe('CHISENGA');
    expect(formatCenterHouseLabel('Bobo')).toBe('BOBO');
    expect(formatCenterHouseLabel('Suite 1 (Master King)')).toBe('SUITE 1');
    expect(formatCenterHouseLabel('Bedroom 3 (Executive Twin)')).toBe('BED 3');
  });

  it('respects custom qrLabel if provided', () => {
    expect(formatCenterHouseLabel('Long House Name', 'VIP-1')).toBe('VIP-1');
  });

  it('verifies that standard generated QR codes decode correctly with jsQR', async () => {
    const targetUrl = buildHouseQRUrl('ROCKSAPA-BOBO-X9Y8');
    // Generate QR as raw 2D pixel array
    const qrData = QRCode.create(targetUrl, { errorCorrectionLevel: 'H' });
    const modules = qrData.modules;
    const size = modules.size;
    const scale = 8;
    const quietZone = 4;
    const fullSize = (size + quietZone * 2) * scale;

    const imgData = new Uint8ClampedArray(fullSize * fullSize * 4);
    // Fill white background
    imgData.fill(255);

    // Draw black QR modules
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules.get(r, c)) {
          const startX = (c + quietZone) * scale;
          const startY = (r + quietZone) * scale;
          for (let py = 0; py < scale; py++) {
            for (let px = 0; px < scale; px++) {
              const idx = ((startY + py) * fullSize + (startX + px)) * 4;
              imgData[idx] = 0;     // R
              imgData[idx + 1] = 0; // G
              imgData[idx + 2] = 0; // B
              imgData[idx + 3] = 255;
            }
          }
        }
      }
    }

    const decoded = jsQR(imgData, fullSize, fullSize);
    expect(decoded).not.toBeNull();
    expect(decoded?.data).toBe(targetUrl);
  });
});
