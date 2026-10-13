import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CloudUpload, LogIn, RefreshCw, TriangleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useOnlineStatus from '../hooks/useOnlineStatus'
import usePendingDeliveries from '../hooks/usePendingDeliveries'
import useSyncState from '../hooks/useSyncState'
import { temporaryReference } from '../offline/pending'
import { discardDelivery, retryDelivery, syncNow } from '../offline/sync'
import { formatKg, formatTime } from '../utils/format'
import ConfirmDialog from './ConfirmDialog'

const statusStyles = {
  WAITING: 'bg-warning/15 text-text',
  SYNCING: 'bg-primary-light text-primary',
  FAILED: 'bg-danger/10 text-danger',
}

function PendingItem({ delivery, onDiscard }) {
  const { t } = useTranslation()
  const failed = delivery.status === 'FAILED'

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            <span className="font-mono text-xs text-muted">{temporaryReference(delivery.clientUuid)}</span>{' '}
            {delivery.memberName}
          </p>
          <p className="text-xs text-muted">
            {t(`grades.${delivery.gradeName}`, { defaultValue: delivery.gradeName })} ·{' '}
            {formatKg(delivery.payload.quantityKg)} · {formatTime(delivery.payload.deliveredAt)}
          </p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[delivery.status]}`}>
          {t(`offline.status.${delivery.status}`)}
        </span>
      </div>
      {failed && delivery.lastError && <p className="text-xs text-danger">{delivery.lastError}</p>}
      <div className="flex gap-2">
        {failed && (
          <button
            type="button"
            onClick={() => retryDelivery(delivery.clientUuid)}
            className="min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90"
          >
            {t('offline.panel.retry')}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDiscard(delivery)}
          disabled={delivery.status === 'SYNCING'}
          className="min-h-9 rounded-md border border-text/10 px-3 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          {t('offline.panel.discard')}
        </button>
      </div>
    </li>
  )
}

// Deliveries kept on this device: a count in the top bar that opens the list with sync actions.
export default function SyncStatus() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const isOnline = useOnlineStatus()
  const { syncing, needsLogin } = useSyncState()
  const deliveries = usePendingDeliveries() ?? []
  const [open, setOpen] = useState(false)
  const [discarding, setDiscarding] = useState(null)
  const panelRef = useRef(null)

  const failedCount = deliveries.filter((delivery) => delivery.status === 'FAILED').length
  const waitingCount = deliveries.length - failedCount

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event) {
      if (!panelRef.current?.contains(event.target)) setOpen(false)
    }
    // While the discard dialog is open, Escape closes only the dialog.
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !discarding) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, discarding])

  if (deliveries.length === 0 && !needsLogin) return null

  // The token was rejected, so the manager logs in again; the queue stays on this device.
  function handleLogInAgain() {
    signOut()
    navigate('/login', { replace: true })
  }

  async function handleDiscard() {
    await discardDelivery(discarding.clientUuid)
    setDiscarding(null)
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          failedCount > 0 || needsLogin ? 'bg-danger/10 text-danger' : 'bg-warning/15 text-text'
        }`}
      >
        {syncing ? <RefreshCw size={12} className="animate-spin" /> : <CloudUpload size={12} />}
        {needsLogin && t('offline.needsLogin')}
        {!needsLogin && waitingCount > 0 && t('offline.waitingCount', { count: waitingCount })}
        {!needsLogin && waitingCount > 0 && failedCount > 0 && ' · '}
        {!needsLogin && failedCount > 0 && t('offline.failedCount', { count: failedCount })}
      </button>

      {open && !discarding && (
        <div className="absolute left-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-surface shadow-lg ring-1 ring-text/10">
          <div className="flex items-center justify-between gap-2 border-b border-text/5 px-4 py-3">
            <p className="text-sm font-semibold text-text">{t('offline.panel.title')}</p>
            <button
              type="button"
              onClick={() => syncNow({ manual: true })}
              disabled={!isOnline || syncing || needsLogin}
              className="flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : undefined} />
              {syncing ? t('offline.panel.syncing') : t('offline.panel.syncNow')}
            </button>
          </div>

          {needsLogin && (
            <div className="space-y-2 bg-danger/10 px-4 py-3 text-xs text-danger">
              <p className="flex items-start gap-1.5">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                {t('offline.panel.needsLogin')}
              </p>
              <button
                type="button"
                onClick={handleLogInAgain}
                className="flex min-h-9 items-center gap-1.5 rounded-md bg-surface px-3 font-semibold text-danger shadow-sm"
              >
                <LogIn size={12} />
                {t('offline.panel.logIn')}
              </button>
            </div>
          )}
          {!isOnline && <p className="bg-background px-4 py-2 text-xs text-muted">{t('offline.panel.offline')}</p>}

          {deliveries.length > 0 ? (
            <ul className="max-h-80 divide-y divide-text/5 overflow-y-auto">
              {deliveries.map((delivery) => (
                <PendingItem key={delivery.clientUuid} delivery={delivery} onDiscard={setDiscarding} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted">{t('offline.panel.empty')}</p>
          )}
        </div>
      )}

      {discarding && (
        <ConfirmDialog
          title={t('offline.discard.title')}
          message={t('offline.discard.message', {
            reference: temporaryReference(discarding.clientUuid),
            member: discarding.memberName,
            kg: formatKg(discarding.payload.quantityKg),
          })}
          confirmLabel={t('offline.discard.confirm')}
          cancelLabel={t('offline.discard.cancel')}
          onConfirm={handleDiscard}
          onCancel={() => setDiscarding(null)}
        />
      )}
    </div>
  )
}
