import { useTranslation } from 'react-i18next'
import { CircleCheck, Scale, Weight } from 'lucide-react'
import { formatKg, formatNumber } from '../../utils/format'
import StatCard from '../dashboard/StatCard'

const noValue = '–'

// totals is the disputes response: openDisputes, openKg and settledDisputes cover every dispute,
// whatever the tab or search. null while the first load runs; failed shows no values.
export default function DisputeSummaryCards({ totals, failed }) {
  const { t } = useTranslation()
  const loading = !totals && !failed
  const value = (render) => <p className="text-2xl font-semibold text-text">{totals ? render(totals) : noValue}</p>

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label={t('disputes.summary.open')} icon={Scale} loading={loading}>
        {value((data) => formatNumber(data.openDisputes))}
      </StatCard>
      <StatCard label={t('disputes.summary.openKg')} icon={Weight} loading={loading}>
        {value((data) => formatKg(Math.round(Number(data.openKg ?? 0) * 100) / 100))}
      </StatCard>
      <StatCard label={t('disputes.summary.settled')} icon={CircleCheck} loading={loading}>
        {value((data) => formatNumber(data.settledDisputes))}
      </StatCard>
    </div>
  )
}
