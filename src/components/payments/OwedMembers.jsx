import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Wallet } from 'lucide-react'
import { getOwed } from '../../api/payments'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import EmptyState from '../EmptyState'
import { formatMoney, formatPhone } from '../../utils/format'

export default function OwedMembers({ reloadKey, onPay }) {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [members, setMembers] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    getOwed(debouncedSearch)
      .then((data) => {
        if (!ignore) setMembers(data.members)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [debouncedSearch, reloadKey, retryKey])

  function renderList() {
    if (loadError) {
      return (
        <EmptyState title={t('payments.owed.error')}>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('payments.owed.retry')}
          </button>
        </EmptyState>
      )
    }
    if (!members) {
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }
    if (members.length === 0) {
      return (
        <EmptyState
          icon={Wallet}
          title={debouncedSearch ? t('payments.owed.noResults') : t('payments.owed.empty')}
        />
      )
    }

    const cell = 'whitespace-nowrap px-3 py-3'
    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-muted">
              <tr>
                {['member', 'memberNumber', 'phone', 'owed'].map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {t(`payments.owed.${column}`)}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {members.map((member) => (
                <tr key={member.memberId}>
                  <td className={cell}>
                    <Link to={`/members/${member.memberId}`} className="text-primary hover:underline">
                      {member.memberName}
                    </Link>
                  </td>
                  <td className={`${cell} font-mono text-xs`}>{member.memberNumber}</td>
                  <td className={cell}>{formatPhone(member.phone)}</td>
                  <td className={`${cell} font-semibold`}>{formatMoney(member.owedRwf)}</td>
                  <td className={`${cell} text-right`}>
                    {onPay && (
                      <button
                        type="button"
                        onClick={() => onPay(member)}
                        className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
                      >
                        {t('payments.owed.pay')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-text/5 md:hidden">
          {members.map((member) => (
            <li key={member.memberId} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link to={`/members/${member.memberId}`} className="font-medium text-primary hover:underline">
                  {member.memberName}
                </Link>
                <p className="text-xs text-muted">
                  {member.memberNumber} · {formatPhone(member.phone)}
                </p>
                <p className="mt-0.5 font-semibold text-text">{formatMoney(member.owedRwf)}</p>
              </div>
              {onPay && (
                <button
                  type="button"
                  onClick={() => onPay(member)}
                  className="min-h-12 shrink-0 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  {t('payments.owed.pay')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{t('payments.owed.title')}</h2>
        <div className="relative w-full sm:w-80">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('payments.owed.searchPlaceholder')}
            aria-label={t('payments.owed.searchLabel')}
            className="min-h-11 w-full rounded-lg border border-transparent bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      {renderList()}
    </section>
  )
}
