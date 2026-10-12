import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'
import { getOwed } from '../../api/payments'
import { formatMoney } from '../../utils/format'

// Always loads without a search, so the total does not change while the list is filtered.
export default function TotalOwedCard({ reloadKey }) {
  const { t } = useTranslation()
  const [owed, setOwed] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    getOwed()
      .then((data) => {
        if (!ignore) setOwed(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-primary p-5 text-white shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">{t('payments.totalOwed')}</p>
        {loadError ? (
          <p className="mt-2 text-sm text-white/80">{t('payments.owed.error')}</p>
        ) : owed ? (
          <>
            <p className="mt-1 text-3xl font-semibold">{formatMoney(owed.totalOwedRwf)}</p>
            <p className="mt-1 text-sm text-white/70">
              {t('payments.membersOwed', { count: owed.members.length })}
            </p>
          </>
        ) : (
          <div className="mt-2 h-9 w-40 animate-pulse rounded bg-white/20" />
        )}
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <Wallet size={20} />
      </div>
    </div>
  )
}
