import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, ShoppingCart, Truck } from 'lucide-react'
import PageTitle from '../../components/PageTitle'
import { MoneyCards, StockCards } from '../../components/dashboard/DashboardSummaryCards'
import HistoryCheckCard from '../../components/dashboard/HistoryCheckCard'
import NeedsAttention from '../../components/dashboard/NeedsAttention'
import RecentDeliveries from '../../components/dashboard/RecentDeliveries'
import WeeklyDeliveriesChart from '../../components/dashboard/WeeklyDeliveriesChart'
import { getDashboard } from '../../api/dashboard'

const quickLinks = [
  { to: '/record-delivery', key: 'recordDelivery', icon: Truck, primary: true },
  { to: '/sales', key: 'recordSale', icon: ShoppingCart },
  { to: '/payments', key: 'payment', icon: Banknote },
]

export default function Dashboard() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    getDashboard()
      .then((data) => {
        if (!ignore) setSummary(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [retryKey])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <PageTitle className="mb-1">{t('dashboard.title', { cooperative: t('app.cooperative') })}</PageTitle>
          <p className="text-sm text-muted">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map(({ to, key, icon: Icon, primary }) => (
            <Link
              key={key}
              to={to}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm ${
                primary ? 'bg-primary text-white hover:bg-primary/90' : 'bg-surface text-text hover:bg-background'
              }`}
            >
              <Icon size={16} />
              {t(`dashboard.quick.${key}`)}
            </Link>
          ))}
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {t('dashboard.error')}
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 font-medium underline"
          >
            {t('dashboard.retry')}
          </button>
        </div>
      )}
      {!loadError && <StockCards summary={summary} />}
      {/* The history check has its own request, so it still shows when the summary fails. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {!loadError && <MoneyCards summary={summary} />}
        <HistoryCheckCard />
      </div>
      {!loadError && <NeedsAttention summary={summary} />}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <RecentDeliveries />
        </div>
        {!loadError && (
          <div className="min-w-0 xl:col-span-2">
            <WeeklyDeliveriesChart weeks={summary?.weeklyDeliveries} />
          </div>
        )}
      </div>
    </div>
  )
}
