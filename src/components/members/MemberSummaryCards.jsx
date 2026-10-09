import { useTranslation } from 'react-i18next'
import { BadgeCheck, UserX, Users } from 'lucide-react'

function SummaryCard({ label, value, note, icon: Icon, iconClass }) {
  return (
    <div className="flex items-start justify-between rounded-xl bg-surface p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {value === undefined ? (
          <div className="mt-2 h-7 w-16 animate-pulse rounded bg-background" />
        ) : (
          <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
        )}
        {note && <p className="mt-1 text-sm text-primary">{note}</p>}
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconClass}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}

export default function MemberSummaryCards({ summary, error, onRetry }) {
  const { t } = useTranslation()

  if (error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-5 text-sm shadow-sm">
        <span className="text-danger">{t('members.error.summary')}</span>
        <button type="button" onClick={onRetry} className="font-medium text-primary hover:underline">
          {t('members.error.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryCard
        label={t('members.summary.total')}
        value={summary?.total}
        note={summary && t('members.summary.joinedThisMonth', { count: summary.joinedThisMonth })}
        icon={Users}
        iconClass="bg-primary-light text-primary"
      />
      <SummaryCard
        label={t('members.summary.active')}
        value={summary?.active}
        icon={BadgeCheck}
        iconClass="bg-primary-light text-primary"
      />
      <SummaryCard
        label={t('members.summary.inactive')}
        value={summary?.inactive}
        icon={UserX}
        iconClass="bg-danger/10 text-danger"
      />
    </div>
  )
}
