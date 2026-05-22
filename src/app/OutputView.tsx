import { useCallback, useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { SlideContent } from './components/SlideContent';
import {
  backendApi,
  connectRealtime,
  getApiBaseUrl,
  type PresentationState,
} from './lib/backend';

const emptyPresentation: PresentationState = {
  preview: null,
  live: null,
  updatedAt: new Date(0).toISOString(),
};

export function OutputView() {
  const [presentation, setPresentation] = useState<PresentationState>(emptyPresentation);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [showControls, setShowControls] = useState(true);

  const apiBase = getApiBaseUrl();
  const displayId = new URLSearchParams(window.location.search).get('display');

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(console.error);
  }, []);

  useEffect(() => {
    backendApi
      .getPresentationState()
      .then((state) => {
        setPresentation(state);
        setStatus('connected');
      })
      .catch(() => setStatus('offline'));

    const socket = connectRealtime({
      onConnected: () => setStatus('connected'),
      onDisconnected: () => setStatus('offline'),
      onPresentationState: setPresentation,
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const show = () => setShowControls(true);
    window.addEventListener('mousemove', show);
    const timer = window.setTimeout(() => setShowControls(false), 3000);
    return () => {
      window.removeEventListener('mousemove', show);
      window.clearTimeout(timer);
    };
  }, [presentation.live, showControls]);

  const live = presentation.live;

  return (
    <div
      className="h-screen w-screen bg-black overflow-hidden flex items-center justify-center"
      onDoubleClick={enterFullscreen}
    >
      {live ? (
        <div className="w-full h-full flex items-center justify-center p-8">
          <SlideContent slide={live} className="max-w-[95vw] max-h-[95vh]" />
        </div>
      ) : (
        <p className="text-[#444] text-lg select-none">Waiting for live output…</p>
      )}

      {showControls && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 px-4 py-2 bg-black/80 text-[#888] text-xs">
          <span>
            Lumina Output
            {displayId ? ` · Display ${displayId}` : ''}
            {' · '}
            {status === 'connected' ? 'Connected' : status === 'offline' ? 'Offline' : 'Connecting…'}
          </span>
          <span className="truncate max-w-[50%]" title={apiBase}>
            {apiBase}
          </span>
          <button
            type="button"
            onClick={enterFullscreen}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#222] hover:bg-[#333] text-[#ccc] shrink-0 cursor-pointer"
          >
            <Maximize2 size={14} />
            Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
