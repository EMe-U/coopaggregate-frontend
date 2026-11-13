import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listPayments } from '../../api/payments'
import FilterMenu from '../FilterMenu'
import Pagination from '../Pagination'
import ReversedBadge from '../ReversedBadge'
import PaymentActionsMenu from './PaymentActionsMenu'
import usePageSize from '../../hooks/usePageSize'
import { formatDay, formatMoney } from '../../utils/format'

const METHODS = ['CASH', 'MOMO', 'BANK']

const methodStyles = {
  CASH: 'bg-background text-text',
  MOMO: 'bg-primary-light text-primary',
  BANK: 'bg-sky-100 text-sky-800',
}

// onChanged runs after a payment was reversed, so the page can reload balances and totals.
export default function PaymentHistory({ reloadKey, onChanged }) {
  const { t } = useTranslation()

  const pageSize = usePageSize()
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    listPayments({ method, page, size: pageSize })
      .then((data) => {
        if (!ignore) setResult(data)
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
  }, [method, page, pageSize, reloadKey, retryKey])

  const cell = 'whitespace-nowrap px-3 py-3'

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{t('payments.history.title')}</h2>
        <div className="-mr-2 ml-auto">
          <FilterMenu
            name={t('payments.history.filterLabel')}
            value={method}
            defaultValue=""
            options={[
              { value: '', label: t('payments.history.all') },
              ...METHODS.map((value) => ({ value, label: t(`payments.methods.${value}`) })),
            ]}
            valueLabel={(filter, value) => t('payments.filterValue', { filter, value })}
            onChange={(value) => {
              setMethod(value)
              setPage(0)
            }}
          />
        </div>
      </div>

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {t('payments.history.error')}
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 font-medium underline"
          >
            {t('payments.history.retry')}
          </button>
        </div>
      )}

      {!loadError && !result && (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )}

      {!loadError && result?.totalElements === 0 && (
        <p className="py-8 text-center text-sm text-muted">
          {method ? t('payments.history.noResults') : t('payments.history.empty')}
        </p>
      )}

      {!loadError && result?.totalElements > 0 && (
        <div className={loading ? 'opacity-60' : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  {['paymentId', 'date', 'member', 'amount', 'method', 'reference'].map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {t(`payments.history.${column}`)}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">{t('reversal.actionsColumn')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text/5">
                {result.content.map((payment) => (
                  <tr key={payment.id} className={payment.reversed ? 'opacity-60' : undefined}>
                    <td className={`${cell} font-mono font-medium text-primary`}>
                      <span className={payment.reversed ? 'line-through' : undefined}>{payment.paymentCode}</span>
                      {payment.reversed && (
                        <span className="mt-1 block font-sans">
                          <ReversedBadge reason={payment.reversalReason} />
                        </span>
                      )}
                    </td>
                    <td className={cell}>{formatDay(payment.paidAt)}</td>
                    <td className={cell}>
                      <Link to={`/members/${payment.memberId}`} className="text-primary hover:underline">
                        {payment.memberName}
                      </Link>
                      <span className="ml-1.5 font-mono text-xs text-muted">{payment.memberNumber}</span>
                    </td>
                    <td className={`${cell} font-semibold`}>{formatMoney(payment.amountRwf)}</td>
                    <td className={cell}>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${methodStyles[payment.method] ?? ''}`}>
                        {t(`payments.methods.${payment.method}`, { defaultValue: payment.method })}
                      </span>
                    </td>
                    <td className={`${cell} font-mono text-xs`}>{payment.reference}</td>
                    <td className="px-3 py-1">
                      <PaymentActionsMenu payment={payment} onChanged={onChanged} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination result={result} onPageChange={setPage} className="mt-3" />
        </div>
      )}
    </section>
  )
}
