import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users } from 'lucide-react'
import { getMemberSummary, listMembers } from '../../api/members'
import PageTitle from '../../components/PageTitle'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import MemberSummaryCards from '../../components/members/MemberSummaryCards'
import MemberTable from '../../components/members/MemberTable'

const PAGE_SIZE = 10

export default function Members() {
  const { t } = useTranslation()

  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(false)

  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const loadSummary = useCallback(() => {
    setSummaryError(false)
    getMemberSummary()
      .then(setSummary)
      .catch(() => setSummaryError(true))
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    // Ignore a slow response if the page changed before it arrived.
    let ignore = false
    setLoading(true)
    setLoadError(false)

    listMembers({ page, size: PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [page, reloadKey])

  function handleEdit() {}

  function renderList() {
    if (loadError) {
      return (
        <EmptyState title={t('members.error.load')}>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-lg border border-text/10 px-4 py-2 text-sm font-medium text-primary hover:bg-background"
          >
            {t('members.error.retry')}
          </button>
        </EmptyState>
      )
    }

    if (loading && !result) {
      return (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }

    if (result.totalElements === 0) {
      return (
        <EmptyState icon={Users} title={t('members.empty.title')} message={t('members.empty.message')} />
      )
    }

    const from = result.page * result.size + 1
    const to = from + result.content.length - 1

    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <MemberTable members={result.content} onEdit={handleEdit} />
        <div className="border-t border-text/5 bg-background/60 px-4 py-3">
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            summary={t('members.pagination.showing', { from, to, total: result.totalElements })}
            onPageChange={setPage}
          />
        </div>
      </div>
    )
  }

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

      <div className="overflow-hidden rounded-xl bg-surface shadow-sm">{renderList()}</div>
    </div>
  )
}
