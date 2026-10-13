import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CircleAlert, CircleCheck } from 'lucide-react'
import { verifyLedger } from '../../api/ledger'
import { formatTime } from '../../utils/format'

export default function HistoryCheckCard() {
  const { t } = useTranslation()
  const [result, setResult] = useState(null)
  const [checkedAt, setCheckedAt] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    verifyLedger()
      .then((data) => {
        if (ignore) return
        setResult(data)
        setCheckedAt(new Date().toISOString())
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [retryKey])

  if (loadError) {
    return (
      <div role="alert" className="min-w-0 rounded-xl bg-surface p-5 text-sm shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('dashboard.history.title')}</p>
        <p className="mt-2 text-danger">{t('dashboard.history.error')}</p>
        <button
          type="button"
          onClick={() => setRetryKey((key) => key + 1)}
          className="min-h-11 font-medium text-danger underline"
        >
          {t('dashboard.retry')}
        </button>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-background" />
        <div className="mt-3 h-6 w-full animate-pulse rounded bg-background" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-background" />
      </div>
    )
  }

  const Icon = result.valid ? CircleCheck : CircleAlert

  return (
    <div
      role="status"
      className={`flex min-w-0 flex-col rounded-xl p-5 text-white shadow-sm ${result.valid ? 'bg-primary' : 'bg-danger'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{t('dashboard.history.title')}</p>
        <Icon size={18} className="shrink-0" />
      </div>
      <p className="mt-2 font-semibold">
        {result.valid
          ? t('dashboard.history.valid', { count: result.checkedEntries })
          : t('dashboard.history.broken', { id: result.firstBrokenEntryId })}
      </p>
      <p className="mt-1 text-xs text-white/80">{t('dashboard.history.checkedAt', { time: formatTime(checkedAt) })}</p>
      <Link
        to="/ledger"
        className="mt-auto inline-flex min-h-11 items-center gap-1 self-end text-sm font-medium hover:underline"
      >
        {t('dashboard.history.view')}
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}
