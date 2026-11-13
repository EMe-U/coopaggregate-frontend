import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, ReceiptText } from 'lucide-react'
import { listBuyerPayments } from '../../api/buyerPayments'
import { listBuyers } from '../../api/buyers'
import ActionsMenu from '../ActionsMenu'
import EmptyState from '../EmptyState'
import FilterMenu from '../FilterMenu'
import Pagination from '../Pagination'
import usePageSize from '../../hooks/usePageSize'
import useGradeName from '../../hooks/useGradeName'
import { formatDay, formatKg, formatMoney } from '../../utils/format'

export const methodStyles = {
  CASH: 'bg-background text-text',
  MOMO: 'bg-primary-light text-primary',
  BANK: 'bg-sky-100 text-sky-800',
}

// How the buyer paid, or "Not recorded" for orders saved before the method was asked.
export function MethodBadge({ method }) {
  const { t } = useTranslation()
  if (!method) return <span className="text-xs italic text-muted">{t('buyerPayments.notRecorded')}</span>
  return (
    <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${methodStyles[method] ?? ''}`}>
      {t(`payments.methods.${method}`, { defaultValue: method })}
    </span>
  )
}

// The grades of the order, in the order of its sales.
function useGradesOf() {
  const gradeName = useGradeName()
  return (payment) => [...new Set(payment.sales.map((sale) => gradeName(sale.gradeName)))].join(' · ')
}

// Money in: one row per buyer payment (an order), newest first. Clicking a row, or ⋮ > View split,
// calls onOpen(payment) to show what each farmer got from it.
export default function BuyerPaymentsTable({ onOpen }) {
  const { t } = useTranslation()
  const gradesOf = useGradesOf()
  const pageSize = usePageSize()

  const [buyers, setBuyers] = useState([])
  const [buyerId, setBuyerId] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    // The buyer filter is optional, so a failure here only leaves it with "All".
    listBuyers()
      .then(setBuyers)
      .catch(() => setBuyers([]))
  }, [])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    listBuyerPayments({ buyerId, page, size: pageSize })
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
  }, [buyerId, page, pageSize, retryKey])

  function viewSplit(payment) {
    return (
      <ActionsMenu
        label={t('buyerPayments.menu', { code: payment.orderCode })}
        actions={[{ key: 'split', icon: Eye, label: t('buyerPayments.viewSplit'), run: () => onOpen(payment) }]}
      />
    )
  }

  function renderBody() {
    if (loadError) {
      return (
        <EmptyState title={t('buyerPayments.error')}>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('buyerPayments.retry')}
          </button>
        </EmptyState>
      )
    }
    if (!result) {
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }
    if (result.totalElements === 0) {
      return <EmptyState icon={ReceiptText} title={buyerId ? t('buyerPayments.noResults') : t('buyerPayments.empty')} />
    }

    const cell = 'px-3 py-3'
    const number = `${cell} whitespace-nowrap text-right`
    // Keeps the ⋮ column in view while the table scrolls sideways.
    const pinned = 'max-lg:sticky max-lg:right-0 max-lg:bg-surface max-lg:shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]'
    const stop = (event) => event.stopPropagation()
    const columns = ['date', 'order', 'buyer', 'grades', 'totalKg', 'amount', 'method', 'reference']

    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm" data-testid="buyer-payments">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-text/10">
                {columns.map((column) => (
                  <th
                    key={column}
                    className={`whitespace-nowrap px-3 py-2 font-semibold ${column === 'totalKg' || column === 'amount' ? 'text-right' : ''}`}
                  >
                    {t(`buyerPayments.columns.${column}`)}
                  </th>
                ))}
                <th className={`px-3 py-2 ${pinned}`}>
                  <span className="sr-only">{t('buyerPayments.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {result.content.map((payment) => (
                <tr
                  key={payment.orderId}
                  onClick={() => onOpen(payment)}
                  title={t('buyerPayments.open', { code: payment.orderCode })}
                  className="cursor-pointer hover:bg-background/70"
                >
                  <td className={`${cell} whitespace-nowrap`}>{formatDay(payment.paidAt)}</td>
                  <td className={`${cell} whitespace-nowrap font-mono font-medium text-primary`}>{payment.orderCode}</td>
                  <td className={`${cell} min-w-32`}>{payment.buyerName}</td>
                  <td className={cell}>{gradesOf(payment)}</td>
                  <td className={number}>{formatKg(payment.totalKg)}</td>
                  <td className={`${number} font-semibold`}>{formatMoney(payment.totalAmountRwf)}</td>
                  <td className={cell}>
                    <MethodBadge method={payment.method} />
                  </td>
                  <td className={`${cell} font-mono text-xs`}>{payment.reference}</td>
                  <td className={`px-1 py-1 text-right ${pinned}`} onClick={stop} onKeyDown={stop}>
                    {viewSplit(payment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-text/5 md:hidden" data-testid="buyer-payments-cards">
          {result.content.map((payment) => (
            <li key={payment.orderId} className="flex items-start gap-2 py-3">
              <button type="button" onClick={() => onOpen(payment)} className="min-w-0 flex-1 space-y-0.5 text-left">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-mono text-sm font-medium text-primary">{payment.orderCode}</span>
                  <span className="font-semibold text-text">{formatMoney(payment.totalAmountRwf)}</span>
                </p>
                <p className="text-sm text-text">{payment.buyerName}</p>
                <p className="text-xs text-muted">
                  {formatDay(payment.paidAt)} · {gradesOf(payment)} · {formatKg(payment.totalKg)}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <MethodBadge method={payment.method} />
                  {payment.reference && <span className="break-all font-mono text-muted">{payment.reference}</span>}
                </p>
              </button>
              {viewSplit(payment)}
            </li>
          ))}
        </ul>

        <Pagination result={result} onPageChange={setPage} className="mt-3" />
      </div>
    )
  }

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <ReceiptText size={20} className="text-primary" />
          {t('buyerPayments.title')}
        </h2>
        <div className="-mr-2 ml-auto flex flex-wrap items-center justify-end gap-x-1">
          <FilterMenu
            name={t('buyerPayments.filters.buyer')}
            value={buyerId}
            defaultValue=""
            options={[
              { value: '', label: t('buyerPayments.filters.all') },
              ...buyers.map((buyer) => ({ value: String(buyer.id), label: buyer.name })),
            ]}
            valueLabel={(filter, value) => t('payments.filterValue', { filter, value })}
            onChange={(value) => {
              setBuyerId(value)
              setPage(0)
            }}
          />
        </div>
      </div>
      {renderBody()}
    </section>
  )
}
