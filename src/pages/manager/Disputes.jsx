import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Scale } from 'lucide-react'
import { listDisputes } from '../../api/disputes'
import EmptyState from '../../components/EmptyState'
import PageTitle from '../../components/PageTitle'
import Pagination from '../../components/Pagination'
import SuccessToast from '../../components/SuccessToast'
import DisputeList from '../../components/disputes/DisputeList'
import DisputeSummaryCards from '../../components/disputes/DisputeSummaryCards'
import MemberFilters from '../../components/members/MemberFilters'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePageSize from '../../hooks/usePageSize'

const TABS = ['open', 'settled']

export default function Disputes() {
  const { t } = useTranslation()
  const pageSize = usePageSize()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('open')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [page, setPage] = useState(0)
  // The whole response: the totals for the cards and the page of disputes.
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    listDisputes({ status: tab, search: debouncedSearch, page, size: pageSize })
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
  }, [tab, debouncedSearch, page, pageSize, reloadKey])

  // A settled dispute leaves the Open tab; the page may now be past the end, so go back to the first.
  function handleChanged(message) {
    setNotice(message)
    setPage(0)
    setReloadKey((key) => key + 1)
  }

  function renderList() {
    if (loadError) {
      return (
        <EmptyState title={t('disputes.error')}>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('disputes.retry')}
          </button>
        </EmptyState>
      )
    }
    if (loading && !result) {
      return (
        <div className="space-y-3 p-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }

    const list = result.disputes
    if (list.totalElements === 0) {
      if (debouncedSearch !== '') return <EmptyState icon={Scale} title={t('disputes.empty.noResults')} />
      return (
        <EmptyState
          icon={Scale}
          title={t(`disputes.empty.${tab}.title`)}
          message={t(`disputes.empty.${tab}.message`)}
        />
      )
    }

    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <DisputeList disputes={list.content} settled={tab === 'settled'} onChanged={handleChanged} />
        <Pagination result={list} onPageChange={setPage} className="border-t border-text/5 bg-background/60 px-4 py-3" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <PageTitle className="mb-1">{t('disputes.title')}</PageTitle>
        <p className="text-sm text-muted">{t('disputes.subtitle')}</p>
      </div>

      <DisputeSummaryCards totals={result} failed={loadError && !result} />

      <MemberFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        status={tab}
        onStatusChange={(value) => {
          setTab(value)
          setPage(0)
        }}
        statuses={TABS}
        statusLabel={(value) => t(`disputes.tabs.${value}`)}
        placeholder={t('disputes.search.placeholder')}
        searchLabel={t('disputes.search.label')}
        filterLabel={t('disputes.tabs.label')}
      />

      <div className="overflow-hidden rounded-xl bg-surface shadow-sm">{renderList()}</div>

      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
