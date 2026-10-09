import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleAlert, Package, Truck, Warehouse } from 'lucide-react'
import { formatKg } from '../../utils/format'

// Kilograms only; no money is calculated here.
function roundKg(kg) {
  return Math.round(Number(kg) * 100) / 100
}

function StockCard({ label, value, note, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-surface p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
        {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
        <Icon size={18} />
      </div>
    </div>
  )
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

  return (
    <div className="space-y-4">
      <BalanceBanner stock={stock} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stock.byGrade.map((grade) => (
          <StockCard
            key={grade.gradeName}
            label={t('lots.cards.gradeAvailable', {
              grade: t(`grades.${grade.gradeName}`, { defaultValue: grade.gradeName }),
            })}
            value={formatKg(roundKg(grade.remainingKg))}
            icon={Package}
          />
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
