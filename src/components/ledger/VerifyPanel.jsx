import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleAlert, CircleCheck, ShieldCheck } from 'lucide-react'
import { verifyLedger } from '../../api/ledger'
import { formatTime } from '../../utils/format'

export default function VerifyPanel({ onViewEntry }) {
  const { t } = useTranslation()
  const [result, setResult] = useState(null)
  const [checkedAt, setCheckedAt] = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(false)

  // Check once when the page opens; the button checks again on demand.
  useEffect(() => {
    handleVerify()
  }, [])

  async function handleVerify() {
    setChecking(true)
    setError(false)
    try {
      setResult(await verifyLedger())
      setCheckedAt(new Date().toISOString())
    } catch {
      setError(true)
    } finally {
      setChecking(false)
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
          <ShieldCheck size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-text">{t('ledger.verify.title')}</h2>
          <p className="text-sm text-muted">{t('ledger.verify.explanation')}</p>
          <p className="mt-1 text-xs text-muted">
            {checkedAt ? t('ledger.verify.lastChecked', { time: formatTime(checkedAt) }) : t('ledger.verify.notChecked')}
          </p>
        </div>
      </div>

      {result && !error && (
        <div
          role="status"
          className={`flex min-w-0 flex-1 basis-64 items-start gap-2 rounded-lg p-3 text-sm font-medium ${
            result.valid ? 'bg-primary-light text-primary' : 'bg-danger/10 text-danger'
          }`}
        >
          {result.valid ? <CircleCheck size={18} className="mt-0.5 shrink-0" /> : <CircleAlert size={18} className="mt-0.5 shrink-0" />}
          <div>
            {result.valid ? (
              t('ledger.verify.intact', { count: result.checkedEntries })
            ) : (
              <>
                <p>{t('ledger.verify.broken', { id: result.firstBrokenEntryId })}</p>
                {onViewEntry && (
                  <button
                    type="button"
                    onClick={() => onViewEntry(result.firstBrokenEntryId)}
                    className="mt-1 min-h-11 font-semibold underline"
                  >
                    {t('ledger.verify.viewEntry', { id: result.firstBrokenEntryId })}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="flex-1 basis-64 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {t('ledger.verify.error')}
        </p>
      )}

      <button
        type="button"
        onClick={handleVerify}
        disabled={checking}
        className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShieldCheck size={16} />
        {checking ? t('ledger.verify.checking') : t('ledger.verify.button')}
      </button>
    </section>
  )
}
