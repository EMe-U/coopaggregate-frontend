import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Inbox } from 'lucide-react'
import { listBuyerRequests } from '../../api/buyerRequests'
import EmptyState from '../../components/EmptyState'
import GradeName from '../../components/GradeName'
import PageTitle from '../../components/PageTitle'
import Pagination from '../../components/Pagination'
import SuccessToast from '../../components/SuccessToast'
import RequestActionsMenu from '../../components/buyerRequests/RequestActionsMenu'
import RequestStatusBadge from '../../components/buyerRequests/RequestStatusBadge'
import RequestSummaryCards from '../../components/buyerRequests/RequestSummaryCards'
import MemberFilters from '../../components/members/MemberFilters'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePageSize from '../../hooks/usePageSize'
import { formatDay, formatKg, formatPhone } from '../../utils/format'

const STATUSES = ['all', 'PENDING', 'ACCEPTED', 'REJECTED']

export default function BuyerRequests() {
  const { t } = useTranslation()
  const pageSize = usePageSize()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [page, setPage] = useState(0)
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
    listBuyerRequests({ status: status === 'all' ? undefined : status, search: debouncedSearch, page, size: pageSize })
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
  }, [status, debouncedSearch, page, pageSize, reloadKey])

  function handleChanged(saved) {
    setNotice(t('buyerRequests.changed', { code: saved.code, status: t(`buyerRequests.status.${saved.status}`) }))
    setReloadKey((key) => key + 1)
  }

  const cell = 'whitespace-nowrap px-4 py-3'

  function renderList() {
    if (loadError) {
      return (
        <EmptyState title={t('buyerRequests.error')}>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('buyerRequests.retry')}
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
    if (result.totalElements === 0) {
      const filtered = debouncedSearch !== '' || status !== 'all'
      return (
        <EmptyState
          icon={Inbox}
          title={filtered ? t('buyerRequests.empty.noResults') : t('buyerRequests.empty.title')}
          message={filtered ? undefined : t('buyerRequests.empty.message')}
        />
      )
    }

    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-muted">
              <tr>
                {['reference', 'buyer', 'grade', 'quantity', 'date', 'status', 'actions'].map((column) => (
                  <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {t(`buyerRequests.columns.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {result.content.map((request) => (
                <tr key={request.id}>
                  <td className={`${cell} font-mono font-semibold text-primary`}>{request.code}</td>
                  <td className={cell}>
                    <p className="font-medium text-text">{request.buyerName}</p>
                    <p className="text-xs text-muted">{formatPhone(request.buyerPhone)}</p>
                  </td>
                  <td className={cell}>
                    <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      <GradeName name={request.gradeName} />
                    </span>
                  </td>
                  <td className={`${cell} font-semibold`}>{formatKg(request.quantityKg)}</td>
                  <td className={`${cell} text-muted`}>{formatDay(request.createdAt)}</td>
                  <td className={cell}>
                    <RequestStatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-2">
                    <RequestActionsMenu request={request} onChanged={handleChanged} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination result={result} onPageChange={setPage} className="border-t border-text/5 bg-background/60 px-4 py-3" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <PageTitle className="mb-1">{t('buyerRequests.title')}</PageTitle>
        <p className="text-sm text-muted">{t('buyerRequests.subtitle')}</p>
      </div>

      <RequestSummaryCards reloadKey={reloadKey} />

      <MemberFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value)
          setPage(0)
        }}
        statuses={STATUSES}
        statusLabel={(value) => (value === 'all' ? t('buyerRequests.filter.all') : t(`buyerRequests.status.${value}`))}
        placeholder={t('buyerRequests.search.placeholder')}
        searchLabel={t('buyerRequests.search.label')}
        filterLabel={t('buyerRequests.filter.label')}
      />

      <div className="overflow-hidden rounded-xl bg-surface shadow-sm">{renderList()}</div>

      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
