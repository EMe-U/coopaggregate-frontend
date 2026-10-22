import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, Clock, MessageSquareWarning, Split, TriangleAlert, Truck, Wallet } from 'lucide-react'

const items = [
  { key: 'disputed', field: 'disputedDeliveries', to: '/deliveries?status=DISPUTED', icon: MessageSquareWarning },
  {
    key: 'waitingConfirmation',
    field: 'pendingConfirmationsOver48h',
    to: '/deliveries?status=PENDING&olderThanHours=48',
    icon: Clock,
  },
  { key: 'readyToShare', field: 'lotsReadyToShare', to: '/share', icon: Split },
  { key: 'readyToSell', field: 'lotsReadyToSell', to: '/sales', icon: Truck },
  { key: 'awaitingPayment', field: 'membersAwaitingPayment', to: '/payments', icon: Wallet },
]

export default function NeedsAttention({ summary }) {
  const { t } = useTranslation()
  const visible = summary ? items.filter((item) => summary[item.field] > 0) : []

  return (
    <section className="min-w-0 rounded-xl border-l-4 border-warning bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <TriangleAlert size={18} className="text-warning" />
          {t('dashboard.attention.title')}
        </h2>
        {visible.length > 0 && (
          <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-text">
            {t('dashboard.attention.count', { count: visible.length })}
          </span>
        )}
      </div>

      {!summary && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.key} className="h-20 animate-pulse rounded-lg bg-background" />
          ))}
        </div>
      )}

      {summary && visible.length === 0 && (
        <p className="flex items-center gap-2 py-2 text-sm font-medium text-primary">
          <CircleCheck size={18} />
          {t('dashboard.attention.allCaughtUp')}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {visible.map(({ key, field, to, icon: Icon }) => (
            <li key={key} className="flex min-w-0 flex-col gap-3 rounded-lg bg-background p-4">
              <p className="flex items-start gap-2 text-sm font-medium text-text">
                <Icon size={16} className="mt-0.5 shrink-0 text-primary" />
                {t(`dashboard.attention.${key}`, { count: summary[field] })}
              </p>
              <Link
                to={to}
                className="inline-flex min-h-11 items-center self-start rounded-lg bg-surface px-3 text-sm font-medium text-primary shadow-sm hover:bg-primary-light"
              >
                {t(`dashboard.attention.${key}Action`)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
