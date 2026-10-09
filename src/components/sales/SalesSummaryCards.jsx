import { useTranslation } from 'react-i18next'
import { Banknote, Scale, Truck, Users } from 'lucide-react'

// The backend has no sales summary endpoint yet, so the cards show no value instead of
// numbers worked out here. Connect them when GET /api/sales/summary exists.
export default function SalesSummaryCards() {
  const { t } = useTranslation()

  const cards = [
    { key: 'salesThisMonth', icon: Banknote },
    { key: 'soldThisMonth', icon: Truck },
    { key: 'buyersThisMonth', icon: Users },
    { key: 'averagePrice', icon: Scale },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map(({ key, icon: Icon }) => (
        <div key={key} className="flex min-w-0 items-start justify-between gap-2 rounded-xl bg-surface p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{t(`sales.summary.${key}`)}</p>
            <p className="mt-1 text-xl font-semibold text-text">{t('sales.summary.noValue')}</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Icon size={16} />
          </div>
        </div>
      ))}
    </div>
  )
}
