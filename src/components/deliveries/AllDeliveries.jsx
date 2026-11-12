import { useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Search, X } from 'lucide-react'
import { listDeliveries } from '../../api/deliveries'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useGradeName from '../../hooks/useGradeName'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import usePageSize from '../../hooks/usePageSize'
import usePendingDeliveries from '../../hooks/usePendingDeliveries'
import useSharedLots from '../../hooks/useSharedLots'
import { loadGrades } from '../../offline/cache'
import { formatDateTime, formatKg, kigaliIsoDate } from '../../utils/format'
import EmptyState from '../EmptyState'
import GradeName from '../GradeName'
import Pagination from '../Pagination'
import ReversedBadge from '../ReversedBadge'
import ConfirmationBadge from './ConfirmationBadge'
import DeliveryActionsMenu from './DeliveryActionsMenu'
import DeliveryLots from './DeliveryLots'
import DeviceQueue from './DeviceQueue'

export const STATUS_FILTERS = ['PENDING', 'CONFIRMED', 'DISPUTED', 'REVERSED']
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

const controlClass =
  'min-h-11 w-full rounded-lg border border-transparent bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

// The filters live in the URL (?tab=all&from=&to=&status=&grade=&q=&page=), so coming back from a
// delivery's details shows the same list.
function readFilters(searchParams) {
  const date = (name) => (DATE.test(searchParams.get(name) ?? '') ? searchParams.get(name) : '')
  const status = searchParams.get('status')
  return {
    from: date('from'),
    to: date('to'),
    status: STATUS_FILTERS.includes(status) ? status : '',
    grade: /^[0-9]+$/.test(searchParams.get('grade') ?? '') ? searchParams.get('grade') : '',
    q: searchParams.get('q') ?? '',
    page: Math.max(0, Number.parseInt(searchParams.get('page'), 10) || 0),
  }
}

function Field({ label, htmlFor, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

// The "All deliveries" tab: what is waiting on this device, then every delivery saved on the server,
// newest first, with filters and a ⋮ menu on each row.
export default function AllDeliveries() {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const pageSize = usePageSize()
  const isOnline = useOnlineStatus()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)
  const today = kigaliIsoDate()

  const [searchText, setSearchText] = useState(filters.q)
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300)
  const [grades, setGrades] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Changes one or more filters; any filter change goes back to the first page.
  function update(changes) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('tab', 'all')
        for (const [name, value] of Object.entries(changes)) {
          if (value === '' || value === null || value === undefined || (name === 'page' && value === 0)) next.delete(name)
          else next.set(name, String(value))
        }
        if (!('page' in changes)) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (debouncedSearch !== filters.q.trim()) update({ q: debouncedSearch })
    // Only the typed text drives this; the URL follows it.
  }, [debouncedSearch])

  useEffect(() => {
    let ignore = false
    loadGrades()
      .then((list) => {
        if (!ignore) setGrades(list ?? [])
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  // A delivery that leaves the device queue (synced) now shows in the server list.
  const pending = usePendingDeliveries()
  const pendingCount = pending?.length
  const previousPendingCount = useRef(pendingCount)
  useEffect(() => {
    if (pendingCount < previousPendingCount.current) setReloadKey((key) => key + 1)
    previousPendingCount.current = pendingCount
  }, [pendingCount])

  const rangeInvalid = filters.from !== '' && filters.to !== '' && filters.from > filters.to
  const { from, to, status, grade, q, page } = filters

  useEffect(() => {
    if (rangeInvalid) return undefined
    let ignore = false
    setLoading(true)
    setLoadError(false)
    listDeliveries({
      from: from || undefined,
      to: to || undefined,
      status: status || undefined,
      // "All" lists reversed deliveries too.
      includeReversed: status === '',
      gradeId: grade || undefined,
      search: q,
      page,
      size: pageSize,
    })
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
  }, [from, to, status, grade, q, page, pageSize, reloadKey, isOnline, rangeInvalid])

  const deliveries = result?.content ?? []
  const sharedLots = useSharedLots(deliveries.map((delivery) => delivery.lotId), reloadKey)
  const filtered = from !== '' || to !== '' || status !== '' || grade !== '' || q.trim() !== ''
  const here = `${location.pathname}${location.search}`

  function clearFilters() {
    setSearchText('')
    setSearchParams({ tab: 'all' }, { replace: true })
  }

  const cell = 'px-3 py-3'
  // The table is wider than the page beside the sidebar and scrolls sideways: the Actions column
  // stays in view at the right on every screen width.
  const pinned = 'sticky right-0 bg-surface shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]'

  function renderList() {
    if (rangeInvalid) {
      return <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{t('allDeliveries.filters.rangeInvalid')}</p>
    }
    if (loadError) {
      if (!isOnline) {
        return <p className="rounded-lg bg-background px-3 py-3 text-sm text-muted">{t('allDeliveries.offline')}</p>
      }
      return (
        <EmptyState title={t('allDeliveries.error')}>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('dashboard.retry')}
          </button>
        </EmptyState>
      )
    }
    if (!result) {
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }
    if (deliveries.length === 0) {
      return (
        <EmptyState icon={ClipboardList} title={filtered ? t('allDeliveries.noResults') : t('allDeliveries.empty')}>
          {filtered && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
            >
              {t('allDeliveries.filters.clear')}
            </button>
          )}
        </EmptyState>
      )
    }

    return (
      <>
        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table data-testid="all-deliveries" className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-text/10">
                {['date', 'receipt', 'member', 'grade', 'kg', 'lot', 'status'].map((column) => (
                  <th key={column} className={`whitespace-nowrap px-3 py-2 font-semibold ${column === 'kg' ? 'text-right' : ''}`}>
                    {t(`allDeliveries.columns.${column}`)}
                  </th>
                ))}
                <th className={`whitespace-nowrap px-3 py-2 font-semibold ${pinned}`}>{t('allDeliveries.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className={delivery.reversed ? 'text-muted' : undefined}>
                  <td className={`${cell} whitespace-nowrap`}>{formatDateTime(delivery.deliveredAt)}</td>
                  <td className={`${cell} whitespace-nowrap font-mono ${delivery.reversed ? 'line-through' : 'text-text'}`}>
                    {delivery.receiptCode}
                  </td>
                  <td className={`${cell} min-w-36`}>
                    <p className="font-medium text-text">{delivery.memberName}</p>
                    <p className="font-mono text-xs text-muted">{delivery.memberNumber}</p>
                  </td>
                  <td className={`${cell} whitespace-nowrap`}>
                    <GradeName name={delivery.gradeName} />
                  </td>
                  <td className={`${cell} whitespace-nowrap text-right`}>{formatKg(delivery.quantityKg)}</td>
                  <td className={`${cell} whitespace-nowrap`}>
                    <DeliveryLots lots={delivery.lots} reversed={delivery.reversed} deliveryId={delivery.id} />
                  </td>
                  <td className={`${cell} whitespace-nowrap`}>
                    {delivery.reversed ? <ReversedBadge reason={delivery.reversalReason} /> : <ConfirmationBadge delivery={delivery} />}
                  </td>
                  <td className={`px-1 py-1 text-right ${pinned}`}>
                    <DeliveryActionsMenu
                      delivery={delivery}
                      lotShared={sharedLots.has(delivery.lotId)}
                      onChanged={() => setReloadKey((key) => key + 1)}
                      detailsFrom={here}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination result={result} onPageChange={(next) => update({ page: next })} className="mt-3" />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <DeviceQueue />

      <section aria-labelledby="all-deliveries-title" className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
        <h2 id="all-deliveries-title" className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <ClipboardList size={20} className="text-primary" />
          {t('allDeliveries.title')}
        </h2>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Field label={t('allDeliveries.filters.search')} htmlFor="deliveries-search" className="col-span-2">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="deliveries-search"
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={t('allDeliveries.filters.searchPlaceholder')}
                className={`${controlClass} pl-9 placeholder:text-muted/70`}
              />
            </div>
          </Field>
          <Field label={t('allDeliveries.filters.from')} htmlFor="deliveries-from">
            <input
              id="deliveries-from"
              type="date"
              value={from}
              max={to || today}
              onChange={(event) => update({ from: event.target.value })}
              className={controlClass}
            />
          </Field>
          <Field label={t('allDeliveries.filters.to')} htmlFor="deliveries-to">
            <input
              id="deliveries-to"
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(event) => update({ to: event.target.value })}
              className={controlClass}
            />
          </Field>
          <Field label={t('allDeliveries.filters.status')} htmlFor="deliveries-status">
            <select
              id="deliveries-status"
              value={status}
              onChange={(event) => update({ status: event.target.value })}
              className={controlClass}
            >
              <option value="">{t('allDeliveries.status.all')}</option>
              {STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {t(`allDeliveries.status.${value}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('allDeliveries.filters.grade')} htmlFor="deliveries-grade">
            <select
              id="deliveries-grade"
              value={grade}
              onChange={(event) => update({ grade: event.target.value })}
              className={controlClass}
            >
              <option value="">{t('allDeliveries.filters.allGrades')}</option>
              {grades.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {gradeName(item.name)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {filtered && (
          <button
            type="button"
            onClick={clearFilters}
            className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <X size={16} />
            {t('allDeliveries.filters.clear')}
          </button>
        )}

        {renderList()}
      </section>
    </div>
  )
}
