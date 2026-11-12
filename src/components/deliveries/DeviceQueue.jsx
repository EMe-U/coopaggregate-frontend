import { useTranslation } from 'react-i18next'
import { CloudUpload, RefreshCw, TriangleAlert } from 'lucide-react'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import useGradeName from '../../hooks/useGradeName'
import usePendingDeliveries from '../../hooks/usePendingDeliveries'
import useSyncState from '../../hooks/useSyncState'
import { temporaryReference } from '../../offline/pending'
import { retryDelivery, syncNow } from '../../offline/sync'
import { formatDateTime, formatKg } from '../../utils/format'

const statusStyles = {
  WAITING: 'bg-warning/15 text-text',
  SYNCING: 'bg-primary-light text-primary',
  FAILED: 'bg-danger/10 text-danger',
}

// "Waiting to sync on this device": the deliveries still in the offline queue (IndexedDB), oldest
// first, with their state and a Sync now button. A failed one is skipped by Sync now, so it has its
// own Retry and shows the server's reason.
export default function DeviceQueue() {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const isOnline = useOnlineStatus()
  const { syncing, needsLogin } = useSyncState()
  const pending = usePendingDeliveries()

  let syncTitle
  if (!isOnline) syncTitle = t('offline.needsInternet')
  else if (needsLogin) syncTitle = t('offline.panel.needsLogin')

  return (
    <section aria-labelledby="device-queue-title" className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="device-queue-title" className="flex items-center gap-2 text-lg font-semibold text-text">
          <CloudUpload size={20} className="text-primary" />
          {t('allDeliveries.queue.title')}
          {pending?.length > 0 && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-text">{pending.length}</span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => syncNow({ manual: true })}
          disabled={!isOnline || syncing || needsLogin || !pending?.length}
          title={syncTitle}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : undefined} />
          {syncing ? t('offline.panel.syncing') : t('offline.panel.syncNow')}
        </button>
      </div>

      {needsLogin && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {t('offline.panel.needsLogin')}
        </p>
      )}
      {!isOnline && pending?.length > 0 && (
        <p className="mb-3 rounded-lg bg-background px-3 py-2 text-sm text-muted">{t('offline.panel.offline')}</p>
      )}

      {pending === null && <div className="h-12 animate-pulse rounded-lg bg-background" />}
      {pending?.length === 0 && (
        <p data-testid="queue-empty" className="rounded-lg bg-background px-3 py-3 text-sm text-muted">
          {t('allDeliveries.queue.empty')}
        </p>
      )}
      {pending?.length > 0 && (
        <ul data-testid="device-queue" className="divide-y divide-text/5 rounded-lg ring-1 ring-text/5">
          {pending.map((delivery) => (
            <li key={delivery.clientUuid} className="flex flex-wrap items-start justify-between gap-2 px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">
                  <span className="font-mono text-xs text-muted">{temporaryReference(delivery.clientUuid)}</span>{' '}
                  {delivery.memberName}
                  {delivery.memberNumber && <span className="font-mono text-xs text-muted"> · {delivery.memberNumber}</span>}
                </p>
                <p className="text-xs text-muted">
                  {gradeName(delivery.gradeName)} · {formatKg(delivery.payload.quantityKg)} ·{' '}
                  {formatDateTime(delivery.payload.deliveredAt ?? delivery.createdAt)}
                </p>
                {delivery.status === 'FAILED' && delivery.lastError && (
                  <p className="mt-1 text-xs text-danger">{delivery.lastError}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[delivery.status]}`}>
                  {t(`offline.status.${delivery.status}`)}
                </span>
                {delivery.status === 'FAILED' && (
                  <button
                    type="button"
                    onClick={() => retryDelivery(delivery.clientUuid)}
                    disabled={!isOnline || needsLogin}
                    title={syncTitle}
                    className="min-h-9 rounded-md border border-text/10 px-3 text-xs font-semibold text-primary hover:bg-background disabled:opacity-50"
                  >
                    {t('offline.panel.retry')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
