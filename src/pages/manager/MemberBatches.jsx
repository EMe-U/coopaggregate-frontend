import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Layers } from 'lucide-react'
import { getMemberBatches } from '../../api/members'
import EmptyState from '../../components/EmptyState'
import GradeName from '../../components/GradeName'
import PageTitle from '../../components/PageTitle'
import Pagination from '../../components/Pagination'
import usePageSize from '../../hooks/usePageSize'
import { formatDay, formatKg, formatMoney } from '../../utils/format'

const FILTERS = ['all', 'unsold']
const cell = 'whitespace-nowrap px-3 py-3'

const PAYMENT_CLASS = {
  NOTHING_SOLD: 'bg-text/10 text-muted',
  BATCH: 'bg-primary-light text-primary',
  LOT_SHARE: 'bg-violet-100 text-violet-800',
  AWAITING_SETTLEMENT: 'bg-warning/15 text-amber-800',
}

// How the kg sold from the batch are paid to the member.
function PaymentStatus({ batch }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${PAYMENT_CLASS[batch.payment] ?? PAYMENT_CLASS.NOTHING_SOLD}`}>
      {t(`memberBatches.payment.${batch.payment}`, { lot: batch.lotCode, defaultValue: batch.payment })}
    </span>
  )
}

// Money credited by batch. A batch paid through a lot share, or not sold yet, has none here.
function Money({ amount, batch, negative }) {
  if (!batch.grossRwf) return <span className="text-muted">–</span>
  return negative ? `−${formatMoney(amount)}` : formatMoney(amount)
}

function Total({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 wrap-break-word text-xl font-semibold text-text">{value}</p>
    </div>
  )
}

export default function MemberBatches() {
  const { t } = useTranslation()
  const { id } = useParams()
  const pageSize = usePageSize()
  const key = 'memberBatches'

  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    getMemberBatches(id, { status: filter, page, size: pageSize })
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
  }, [id, filter, page, pageSize, reloadKey])

  const backLink = (
    <Link to={`/members/${id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-primary">
      <ArrowLeft size={16} />
      {t(`${key}.back`)}
    </Link>
  )

  if (loadError && !result) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="rounded-xl bg-surface shadow-sm">
          <EmptyState icon={Layers} title={t(`${key}.error`)}>
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
            >
              {t(`${key}.retry`)}
            </button>
          </EmptyState>
        </div>
      </div>
    )
  }

  if (!result) return <div className="h-64 animate-pulse rounded-xl bg-surface shadow-sm" />

  const batches = result.batches.content
  const { totals, earnings } = result

  return (
    <div className="space-y-6">
      {backLink}
      <div>
        <PageTitle className="mb-1">{t(`${key}.title`, { name: result.memberName })}</PageTitle>
        <p className="text-sm text-muted">{t(`${key}.subtitle`, { number: result.memberNumber })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Total label={t(`${key}.totals.received`)} value={formatKg(totals.receivedKg)} />
        <Total label={t(`${key}.totals.sold`)} value={formatKg(totals.soldKg)} />
        <Total label={t(`${key}.totals.lost`)} value={formatKg(totals.lostKg)} />
        <Total label={t(`${key}.totals.remaining`)} value={formatKg(totals.remainingKg)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Total label={t(`${key}.earnings.gross`)} value={formatMoney(earnings.grossRwf)} />
        <Total label={t(`${key}.earnings.deduction`)} value={formatMoney(earnings.deductionRwf)} />
        <Total label={t(`${key}.earnings.earned`)} value={formatMoney(earnings.earnedRwf)} />
      </div>
      <p className="-mt-2 text-xs text-muted">{t(`${key}.earnings.note`)}</p>

      <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-text/5 p-4">
          <h2 className="font-semibold text-text">{t(`${key}.listTitle`)}</h2>
          <div className="flex rounded-md bg-background p-0.5 text-sm">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value)
                  setPage(0)
                }}
                className={`min-h-9 rounded px-3 ${filter === value ? 'bg-surface font-medium text-text shadow-sm' : 'text-muted hover:text-text'}`}
              >
                {t(`${key}.filter.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {batches.length === 0 ? (
          <EmptyState icon={Layers} title={t(`${key}.empty.${filter}`)} />
        ) : (
          <div className={loading ? 'opacity-60' : undefined}>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                  <tr>
                    {['receipt', 'delivered', 'grade', 'lot', 'payment', 'received', 'sold', 'lost', 'remaining', 'gross', 'deduction', 'earned'].map((column) => (
                      <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {t(`${key}.columns.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-text/5">
                  {batches.map((batch) => (
                    <tr key={batch.deliveryId}>
                      <td className={`${cell} font-mono text-xs`}>
                        <Link to={`/deliveries/${batch.deliveryId}`} className="text-primary hover:underline">
                          {batch.receiptCode}
                        </Link>
                      </td>
                      <td className={`${cell} text-muted`}>{formatDay(batch.deliveredAt)}</td>
                      <td className={cell}>
                        <GradeName name={batch.gradeName} />
                      </td>
                      <td className={`${cell} font-mono text-xs`}>
                        <Link to={`/lots/${batch.lotId}`} className="text-primary hover:underline">
                          {batch.lotCode}
                        </Link>
                      </td>
                      <td className="min-w-52 px-3 py-3">
                        <PaymentStatus batch={batch} />
                      </td>
                      <td className={cell}>{formatKg(batch.receivedKg)}</td>
                      <td className={cell}>{formatKg(batch.soldKg)}</td>
                      <td className={cell}>{formatKg(batch.lostKg)}</td>
                      <td className={`${cell} font-medium`}>{formatKg(batch.remainingKg)}</td>
                      <td className={cell}>
                        <Money amount={batch.grossRwf} batch={batch} />
                      </td>
                      <td className={`${cell} text-muted`}>
                        <Money amount={batch.deductionRwf} batch={batch} negative />
                      </td>
                      <td className={`${cell} font-semibold`}>
                        <Money amount={batch.earnedRwf} batch={batch} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-text/5 lg:hidden">
              {batches.map((batch) => (
                <li key={batch.deliveryId} className="space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link to={`/deliveries/${batch.deliveryId}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {batch.receiptCode}
                      </Link>
                      <p className="text-xs text-muted">
                        {formatDay(batch.deliveredAt)} · <GradeName name={batch.gradeName} /> ·{' '}
                        <Link to={`/lots/${batch.lotId}`} className="font-mono text-primary hover:underline">
                          {batch.lotCode}
                        </Link>
                      </p>
                    </div>
                    <PaymentStatus batch={batch} />
                  </div>
                  <p className="text-xs text-muted">
                    {t(`${key}.card.kg`, {
                      received: formatKg(batch.receivedKg),
                      sold: formatKg(batch.soldKg),
                      lost: formatKg(batch.lostKg),
                      remaining: formatKg(batch.remainingKg),
                    })}
                  </p>
                  {batch.grossRwf > 0 && (
                    <p>
                      {t(`${key}.card.money`, {
                        gross: formatMoney(batch.grossRwf),
                        deduction: formatMoney(batch.deductionRwf),
                        earned: formatMoney(batch.earnedRwf),
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <Pagination result={result.batches} onPageChange={setPage} className="border-t border-text/5 bg-background/60 px-4 py-3" />
          </div>
        )}
      </div>
    </div>
  )
}
