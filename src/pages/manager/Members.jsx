import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users } from 'lucide-react'
import { getMemberSummary } from '../../api/members'
import PageTitle from '../../components/PageTitle'
import MemberSummaryCards from '../../components/members/MemberSummaryCards'

export default function Members() {
  const { t } = useTranslation()

  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(false)

  const loadSummary = useCallback(() => {
    setSummaryError(false)
    getMemberSummary()
      .then(setSummary)
      .catch(() => setSummaryError(true))
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Users size={14} />
            {t('members.eyebrow')}
          </p>
          <PageTitle className="mb-1">{t('members.title')}</PageTitle>
          <p className="text-sm text-muted">{t('members.subtitle')}</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
        >
          <UserPlus size={16} />
          {t('members.add')}
        </button>
      </div>

      <MemberSummaryCards summary={summary} error={summaryError} onRetry={loadSummary} />
    </div>
  )
}
