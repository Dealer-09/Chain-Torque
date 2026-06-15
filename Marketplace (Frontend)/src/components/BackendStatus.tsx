import React from 'react';
import { useSystemStatus } from '@/hooks/useSystemStatus';

interface BackendStatusProps {
  isVisible: boolean;
  onClose: () => void;
}

const BackendStatus: React.FC<BackendStatusProps> = ({
  isVisible,
  onClose,
}) => {
  const { status, checkBackend, getStatusColor } = useSystemStatus();
  const [isBrave, setIsBrave] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
      (navigator as any).brave.isBrave().then((res: boolean) => {
        setIsBrave(res);
      }).catch(() => {});
    }
  }, []);

  return (
    <>
      {isVisible && (
        <>
          {/* Backdrop overlay */}
          <div className='fixed inset-0 bg-black/20 z-40' onClick={onClose} />

          {/* Status panel */}
          <div className='fixed top-20 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-50 min-w-[280px] max-w-[320px]'>
            <div className='flex justify-between items-center mb-3'>
              <h3 className='text-lg font-semibold'>System Status</h3>
              <button
                onClick={onClose}
                className='text-gray-400 hover:text-white p-1 rounded'
                aria-label='Close status panel'
              >
                ✕
              </button>
            </div>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>Backend:</span>
                <span className={getStatusColor(status.backend)}>
                  {status.backend}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Web3:</span>
                <span className={getStatusColor(status.web3)}>
                  {status.web3}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Contract:</span>
                <span className={getStatusColor(status.contract)}>
                  {status.contract}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Items:</span>
                <span className='text-blue-400'>{status.marketplaceItems}</span>
              </div>
              <div className='text-xs text-gray-400 mt-3 pt-2 border-t border-gray-700'>
                Last check: {status.lastCheck}
              </div>
            </div>
            <button
              onClick={checkBackend}
              className='mt-3 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 w-full transition-colors'
            >
              Refresh Status
            </button>

            {status.backend === 'disconnected' && (
              <div className='mt-3 p-2.5 bg-red-950/80 border border-red-800 rounded text-xs text-red-200 leading-relaxed'>
                {isBrave ? (
                  <span>
                    <strong>Brave Shields Active?</strong> Brave blocks cross-site connections by default. Please turn off Brave Shields (lion icon in address bar) or allow third-party cookies to connect.
                  </span>
                ) : (
                  <span>
                    <strong>Connection Blocked?</strong> Ad-blockers or privacy extensions (like uBlock Origin/Privacy Badger) can sometimes block cross-origin Render APIs. Try allowing connections if blocked.
                  </span>
                )}
              </div>
            )}

            {status.contract === 'not deployed' && (
              <div className='mt-3 p-2 bg-yellow-900 border border-yellow-600 rounded text-xs'>
                ⚠️ Run <code>npm run deploy:contracts</code> to enable Web3
                features
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default BackendStatus;
