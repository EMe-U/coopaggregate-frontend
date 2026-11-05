import { useTranslation } from 'react-i18next'
import { CloudOff, LoaderCircle, RotateCw } from 'lucide-react'
import useServerStatus from '../hooks/useServerStatus'
import useOnlineStatus from '../hooks/useOnlineStatus'
import { retryServer } from '../api/serverStatus'

// A calm line while the sleeping server wakes up, and a clear message with "Try again" when it
// could not be reached. Offline, the offline messages explain it instead. withRetry false (the
// login page, which shows its own message) shows only the waking line.
export default function ServerStatusNotice({ withRetry = true, className = '' }) {
  const { t } = useTranslation()
  const { waking, unreachable } = useServerStatus()
  const isOnline = useOnlineStatus()

  return (
    <div role="status" aria-live="polite" className={`print:hidden ${className}`}>
      {waking ? (
        <p className="flex items-start gap-2 bg-primary-light px-4 py-2.5 text-sm text-primary">
          <LoaderCircle size={16} className="mt-0.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
          {t('server.waking')}
        </p>
      ) : (
        withRetry &&
        unreachable &&
        isOnline && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <p className="flex min-w-0 flex-1 basis-56 items-start gap-2">
              <CloudOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {t('server.unreachable')}
            </p>
            <button
              type="button"
              onClick={retryServer}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 font-semibold text-amber-900 ring-1 ring-amber-900/20 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900"
            >
              <RotateCw size={15} aria-hidden="true" />
              {t('server.retry')}
            </button>
          </div>
        )
      )}
    </div>
  )
}
