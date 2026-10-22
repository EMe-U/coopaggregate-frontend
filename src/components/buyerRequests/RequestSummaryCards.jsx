import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, FileText, Warehouse } from 'lucide-react'
import { listBuyerRequests } from '../../api/buyerRequests'
import { getStock } from '../../api/lots'
import { formatKg, formatNumber } from '../../utils/format'
import GradeName from '../GradeName'

const PAGE_SIZE = 100
const noValue = '–'

// The backend has no totals for requests, so every pending request is read. There are few: they
// leave this status when the manager answers them. Kilograms are added for display only.
async function loadPendingTotals() {
  let count = 0
  let kg = 0
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listBuyerRequests({ status: 'PENDING', page, size: PAGE_SIZE })
    count = data.totalElements
    kg += data.content.reduce((sum, request) => sum + Number(request.quantityKg), 0)
    totalPages = data.totalPages
    page++
  }
  return { count, kg: Math.round(kg * 100) / 100 }
}

function Card({ label, value, note, icon: Icon, children }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-surface p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
        {note && <p className="mt-1 text-sm text-muted">{note}</p>}
        {children}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
        <Icon size={18} />
      </div>
    </div>
  )
}

// reloadKey changes after a status change, so the pending numbers follow.
export default function RequestSummaryCards({ reloadKey }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(null)
  const [stock, setStock] = useState(null)

  useEffect(() => {
    let ignore = false
    // A card that cannot be loaded shows no value; the list below still works.
    loadPendingTotals()
      .then((data) => !ignore && setPending(data))
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [reloadKey])

  useEffect(() => {
    let ignore = false
    getStock()
      .then((data) => !ignore && setStock(data))
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card
        label={t('buyerRequests.summary.pending')}
        value={pending ? formatNumber(pending.count) : noValue}
        note={t('buyerRequests.summary.needsReview')}
        icon={FileText}
      />
      <Card
        label={t('buyerRequests.summary.pendingKg')}
        value={pending ? formatKg(pending.kg) : noValue}
        note={t('buyerRequests.summary.fromPending')}
        icon={Clock}
      />
      <Card
        label={t('buyerRequests.summary.stock')}
        value={stock ? formatKg(Math.round(Number(stock.totalRemainingKg) * 100) / 100) : noValue}
        icon={Warehouse}
      >
        {stock?.byGrade?.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1.5">
            {stock.byGrade.map((grade) => (
              <span key={grade.gradeName} className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                <GradeName name={grade.gradeName} /> {formatKg(Math.round(Number(grade.remainingKg) * 100) / 100)}
              </span>
            ))}
          </p>
        )}
      </Card>
    </div>
  )
}
