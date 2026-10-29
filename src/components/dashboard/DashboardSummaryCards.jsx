import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FolderOpen, Package, TrendingUp, Truck, Users, Wallet } from 'lucide-react'
import GradeName from '../GradeName'
import StatCard from './StatCard'
import { formatKg, formatMoney, formatNumber } from '../../utils/format'

const valueClass = 'break-words text-2xl font-semibold text-text'
const linkClass = 'mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline'

// summary is the /api/dashboard response, or null while it loads.
export function StockCards({ summary }) {
  const { t } = useTranslation()
  const loading = !summary

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('dashboard.cards.members')} icon={Users} loading={loading}>
        {summary && (
          <>
            <p className={valueClass}>{formatNumber(summary.totalMembers)}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
              <TrendingUp size={14} />
              {t('dashboard.cards.joinedThisMonth', { count: summary.membersJoinedThisMonth })}
            </p>
            <p className="text-xs text-muted">{t('dashboard.cards.active', { count: summary.activeMembers })}</p>
          </>
        )}
      </StatCard>

      <StatCard label={t('dashboard.cards.stock')} icon={Package} loading={loading}>
        {summary && (
          <>
            <p className={valueClass}>{formatKg(summary.stockKg)}</p>
            {/* Only sellable (confirmed) kg can be sold; the rest waits for the member or is disputed. */}
            <p className="mt-1 text-xs font-medium text-primary">
              {t('dashboard.cards.sellableWaiting', { sellable: formatKg(summary.sellableKg), waiting: formatKg(summary.waitingKg) })}
              {Number(summary.disputedKg) > 0 && ` · ${t('dashboard.cards.disputed', { kg: formatKg(summary.disputedKg) })}`}
            </p>
            <ul className="mt-1 text-xs text-muted">
              {summary.stockByGradeDetail.map((grade) => (
                <li key={grade.gradeName}>
                  <GradeName name={grade.gradeName} />: {formatKg(grade.remainingKg)}
                  {Number(grade.sellableKg) !== Number(grade.remainingKg) &&
                    ` ${t('dashboard.cards.gradeSellable', { kg: formatKg(grade.sellableKg) })}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </StatCard>

      <StatCard label={t('dashboard.cards.deliveriesToday')} icon={Truck} loading={loading}>
        {summary && (
          <p className={valueClass}>
            {formatNumber(summary.deliveriesTodayCount)}{' '}
            <span className="text-sm font-normal text-muted">({formatKg(summary.deliveriesTodayKg)})</span>
          </p>
        )}
      </StatCard>

      <StatCard label={t('dashboard.cards.openLots')} icon={FolderOpen} loading={loading}>
        {summary && (
          <>
            <p className={valueClass}>{formatNumber(summary.openLots.length)}</p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              {summary.openLots.map((lot) => (
                <li key={lot.id}>
                  <Link to={`/lots/${lot.id}`} className="font-mono text-primary hover:underline">
                    {lot.code}
                  </Link>{' '}
                  · <GradeName name={lot.gradeName} />
                </li>
              ))}
            </ul>
          </>
        )}
      </StatCard>
    </div>
  )
}

export function MoneyCards({ summary }) {
  const { t } = useTranslation()
  const loading = !summary

  return (
    <>
      <StatCard label={t('dashboard.cards.owed')} icon={Wallet} loading={loading}>
        {summary && (
          <>
            <p className={valueClass}>{formatMoney(summary.owedToMembersRwf)}</p>
            <Link to="/payments" className={linkClass}>
              {t('dashboard.cards.membersWaiting', { count: summary.membersAwaitingPayment })}
              <ArrowRight size={14} />
            </Link>
          </>
        )}
      </StatCard>
    </>
  )
}
