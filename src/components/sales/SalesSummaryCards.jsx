import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, Scale, Truck, Users } from 'lucide-react'
import { getSalesSummary } from '../../api/sales'
import { formatKg, formatMoney } from '../../utils/format'

export default function SalesSummaryCards({ reloadKey }) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let ignore = false
    getSalesSummary()
      .then((data) => {
        if (!ignore) setSummary(data)
      })
      // The cards keep showing no value; the rest of the page still works.
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [reloadKey])

  const noValue = t('sales.summary.noValue')
  // The average is rounded for display only; it can be null when nothing was sold this month.
  const averagePrice =
    summary?.averagePricePerKg == null
      ? noValue
      : t('sales.summary.perKg', { amount: formatMoney(Math.round(Number(summary.averagePricePerKg))) })

  const cards = [
    { key: 'salesThisMonth', icon: Banknote, value: summary ? formatMoney(summary.salesAmountThisMonth) : noValue },
    { key: 'soldThisMonth', icon: Truck, value: summary ? formatKg(summary.soldKgThisMonth) : noValue },
    { key: 'buyersThisMonth', icon: Users, value: summary ? summary.buyersThisMonth : noValue },
    { key: 'averagePrice', icon: Scale, value: summary ? averagePrice : noValue },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map(({ key, icon: Icon, value }) => (
        <div key={key} className="flex min-w-0 items-start justify-between gap-2 rounded-xl bg-surface p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{t(`sales.summary.${key}`)}</p>
            <p className="mt-1 break-words text-xl font-semibold text-text">{value}</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Icon size={16} />
          </div>
        </div>
      ))}
    </div>
  )
}
