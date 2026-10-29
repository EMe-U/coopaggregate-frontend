import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleAlert, Clock, MessageSquareWarning, Package, PackageCheck, Truck, Warehouse } from 'lucide-react'
import { formatKg } from '../../utils/format'
import useGradeName from '../../hooks/useGradeName'

// Kilograms only; no money is calculated here.
function roundKg(kg) {
  return Math.round(Number(kg) * 100) / 100
}

const ICON_CLASS = {
  primary: 'bg-primary-light text-primary',
  waiting: 'bg-warning/15 text-amber-800',
  disputed: 'bg-danger/10 text-danger',
}

// children is a quieter line under the value, for example the waiting and disputed kg of a grade.
function StockCard({ label, value, note, icon: Icon, tone = 'primary', children }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-surface p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
        {children}
        {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_CLASS[tone]}`}>
        <Icon size={18} />
      </div>
    </div>
  )
}

// The kg of a grade that cannot be sold yet, shown only when there are some.
function NotSellable({ grade }) {
  const { t } = useTranslation()
  const parts = []
  if (Number(grade.waitingKg) > 0) parts.push(t('lots.split.waitingShort', { kg: formatKg(roundKg(grade.waitingKg)) }))
  if (Number(grade.disputedKg) > 0) parts.push(t('lots.split.disputedShort', { kg: formatKg(roundKg(grade.disputedKg)) }))
  if (parts.length === 0) return null
  return <p className="mt-1 text-xs text-muted">{parts.join(' · ')}</p>
}

function BalanceBanner({ stock }) {
  const { t } = useTranslation()
  const accounted = roundKg(Number(stock.totalSoldKg) + Number(stock.totalLostKg) + Number(stock.totalRemainingKg))
  const difference = roundKg(Number(stock.totalDeliveredKg) - accounted)
  const balanced = difference === 0

  return (
    <div
      className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
        balanced ? 'bg-primary-light text-primary' : 'bg-danger/10 text-danger'
      }`}
    >
      {balanced ? <CircleCheck size={20} className="mt-0.5 shrink-0" /> : <CircleAlert size={20} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="font-semibold">{t('lots.balance.title')}</p>
        <p className="break-words">
          {t('lots.balance.formula', {
            delivered: formatKg(roundKg(stock.totalDeliveredKg)),
            sold: formatKg(roundKg(stock.totalSoldKg)),
            lost: formatKg(roundKg(stock.totalLostKg)),
            inStock: formatKg(roundKg(stock.totalRemainingKg)),
          })}
        </p>
        <p className="mt-0.5">
          {balanced ? t('lots.balance.ok') : t('lots.balance.mismatch', { difference: formatKg(Math.abs(difference)) })}
        </p>
      </div>
    </div>
  )
}

export default function StockOverview({ stock, error, onRetry }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()

  if (error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-5 text-sm shadow-sm">
        <span className="text-danger">{t('lots.stockError')}</span>
        <button type="button" onClick={onRetry} className="min-h-11 font-medium text-primary hover:underline">
          {t('lots.retry')}
        </button>
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-xl bg-surface shadow-sm" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-surface shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  // The kg left are split three ways: sellable (confirmed), waiting for the member's confirmation, and
  // disputed. Only sellable kg can be sold. byGrade lists only grades with kg left.
  return (
    <div className="space-y-4">
      <BalanceBanner stock={stock} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StockCard label={t('lots.split.sellable')} value={formatKg(roundKg(stock.totalSellableKg))} icon={PackageCheck} />
        <StockCard label={t('lots.split.waiting')} value={formatKg(roundKg(stock.totalWaitingKg))} icon={Clock} tone="waiting" />
        <StockCard
          label={t('lots.split.disputed')}
          value={formatKg(roundKg(stock.totalDisputedKg))}
          icon={MessageSquareWarning}
          tone="disputed"
        />
      </div>
      <p className="text-xs text-muted">{t('lots.split.explanation')}</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
        {stock.byGrade.map((grade) => (
          <StockCard
            key={grade.gradeName}
            label={t('lots.cards.gradeSellable', { grade: gradeName(grade.gradeName) })}
            value={formatKg(roundKg(grade.sellableKg))}
            icon={Package}
          >
            <NotSellable grade={grade} />
          </StockCard>
        ))}
        <StockCard
          label={t('lots.cards.totalInStock')}
          value={formatKg(roundKg(stock.totalRemainingKg))}
          note={t('lots.cards.lotCounts', { open: stock.openLots, closed: stock.closedLots })}
          icon={Warehouse}
        />
        <StockCard
          label={t('lots.cards.addedToday')}
          value={formatKg(roundKg(stock.addedTodayKg))}
          note={t('lots.cards.deliveriesToday', { count: stock.deliveriesToday })}
          icon={Truck}
        />
      </div>
    </div>
  )
}
