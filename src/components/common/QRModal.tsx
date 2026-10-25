import React, { useState, useSyncExternalStore } from 'react';
import { dbService, subscribeToStore } from '../../lib/store';
import { QrCode, X, ArrowRight, Check, Sparkles, Building2 } from 'lucide-react';
import { Property, Room, QRCodeRecord } from '../../types';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (propertySlug: string, roomId: string) => void;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, onSelectRoom }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');

  const qrCodes = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllQRCodes,
    dbService.getAllQRCodes
  );

  const properties = useSyncExternalStore(
    subscribeToStore,
    dbService.getProperties,
    dbService.getProperties
  );

  const rooms = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRooms,
    dbService.getAllRooms
  );

  if (!isOpen) return null;

  const handleSimulateScan = (token: string) => {
    const record = dbService.getQRCodeByToken(token);
    if (!record) {
      setError('Invalid QR token or room not active.');
      return;
    }
    const prop = properties.find(p => p.id === record.propertyId);
    if (!prop) {
      setError('Property associated with QR is disabled or suspended.');
      return;
    }
    if (record.roomId) {
      onSelectRoom(prop.slug, record.roomId);
      onClose();
    } else {
      // If public location (e.g. pool), pick first room of this property
      const defaultRoom = rooms.find(r => r.propertyId === prop.id);
      if (defaultRoom) {
        onSelectRoom(prop.slug, defaultRoom.id);
        onClose();
      } else {
        setError(`QR token is for public location: ${record.locationType}`);
      }
    }
  };

  const filteredQRs = selectedPropertyFilter === 'all'
    ? qrCodes
    : qrCodes.filter(q => q.propertyId === selectedPropertyFilter);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop-animate">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] space-y-4 max-h-[90vh] flex flex-col modal-content-animate">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">QR Code Room Resolver</h2>
              <p className="text-[11px] text-stone-500 font-medium">Scan physical in-room plaque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 active:scale-[0.92] transition-[background-color,color,transform] duration-140"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          In production, guests point their smartphone camera at brass/acrylic QR plaques placed in their bedroom or villa. Select any plaque below to test immediate session routing:
        </p>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200/90 shadow-2xs">
            {error}
          </div>
        )}

        {/* Property Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedPropertyFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              selectedPropertyFilter === 'all'
                ? 'bg-emerald-900 text-white shadow-2xs'
                : 'bg-stone-100/90 text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 border border-stone-900/[0.05]'
            }`}
          >
            All Plaques
          </button>
          {properties.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPropertyFilter(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                selectedPropertyFilter === p.id
                  ? 'bg-emerald-900 text-white shadow-2xs'
                  : 'bg-stone-100/90 text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 border border-stone-900/[0.05]'
              }`}
            >
              {p.name.replace(' Luxury Lodge', '').replace(' Camp', '')}
            </button>
          ))}
        </div>

        {/* List of sample QR codes */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {filteredQRs.map((qr) => {
            const prop = properties.find((p) => p.id === qr.propertyId);
            const room = qr.roomId ? rooms.find((r) => r.id === qr.roomId) : null;
            return (
              <button
                key={qr.id}
                onClick={() => handleSimulateScan(qr.token)}
                className="w-full text-left p-3.5 rounded-2xl border border-stone-900/[0.08] [@media(hover:hover)_and_(pointer:fine)]:hover:border-emerald-800/60 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-50/40 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between group shadow-diffused select-none"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {room ? `Room: ${room.roomNumber}` : qr.locationType.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-900/[0.08] font-semibold">
                      {qr.token}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    <span className="font-semibold text-stone-700">{prop?.name}</span> &bull; {room?.roomType || 'Public Location'}
                  </p>
                  {room?.currentGuestName && (
                    <p className="text-[10px] text-emerald-800 font-medium mt-0.5">
                      Assigned Guest: {room.currentGuestName}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-900 group-hover:translate-x-0.5 transition-[color,transform] duration-150" />
              </button>
            );
          })}
        </div>

        {/* Manual Token Entry */}
        <div className="pt-3 border-t border-stone-100">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5 font-mono">
            Or Enter QR Token Manually:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. ROCKS-SUITE1-8F21"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 text-xs p-2.5 rounded-xl border border-stone-900/[0.1] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-900 font-mono"
            />
            <button
              onClick={() => handleSimulateScan(tokenInput.trim())}
              className="px-4 py-2.5 bg-emerald-950 text-amber-200 text-xs font-bold rounded-xl active:scale-[0.96] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-900 transition-[background-color,transform] duration-140 select-none shadow-xs"
            >
              Resolve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
