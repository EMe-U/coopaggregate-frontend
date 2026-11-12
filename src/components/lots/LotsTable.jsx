import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes } from 'lucide-react'
import { listGrades } from '../../api/grades'
import { listActiveLots, listLots } from '../../api/lots'
import EmptyState from '../EmptyState'
import FilterMenu from '../FilterMenu'
import GradeName from '../GradeName'
import Pagination from '../Pagination'
import usePageSize from '../../hooks/usePageSize'
import LotActionsMenu from './LotActionsMenu'
import LotFill from './LotFill'
import LotStatusBadge, { lotStatusLabel } from './LotStatusBadge'
import { formatDate, formatKg, formatMoney } from '../../utils/format'
import useGradeName from '../../hooks/useGradeName'

// The list opens on the lots in use (filling and full). Sold and emptied lots are only hidden from
// it: each has its own choice, and "All" also lists the older lots (from before fixed-size lots).
const STATUS_FILTERS = ['active', 'SOLD', 'EMPTIED', 'all']


function LotDates({ lot }) {
  const { t } = useTranslation()
  return lot.closedAt
    ? t('lots.table.period', { from: formatDate(lot.createdAt), to: formatDate(lot.closedAt) })
    : t('lots.table.fillingSince', { date: formatDate(lot.createdAt) })
}

// The table shows the dates on two lines so the column stays narrow on a laptop screen.
function LotDatesStacked({ lot }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="block whitespace-nowrap">{formatDate(lot.createdAt)}</span>
      <span className="block whitespace-nowrap">
        {lot.closedAt ? `– ${formatDate(lot.closedAt)}` : t('lots.table.stillFilling')}
      </span>
    </>
  )
}

function SaleAmount({ amount }) {
  return amount ? formatMoney(amount) : <span className="text-muted">–</span>
}

export default function LotsTable({ reloadKey, onRecordLoss }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const pageSize = usePageSize()
  const filterValue = (filter, value) => t('lots.filters.value', { filter, value })

  const [grades, setGrades] = useState([])
  const [status, setStatus] = useState('active')
  const [gradeId, setGradeId] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    // The grade filter is optional, so a failure here only hides its options.
    listGrades()
      .then(setGrades)
      .catch(() => setGrades([]))
  }, [])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    const request =
      status === 'active'
        ? listActiveLots({ gradeId, page, size: pageSize })
        : listLots({ status: status === 'all' ? undefined : status, gradeId, page, size: pageSize })
    request
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
  }, [status, gradeId, page, pageSize, reloadKey, retryKey])

  function renderBody() {
    if (loadError) {
      return (
        <EmptyState title={t('lots.table.error')}>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('lots.retry')}
          </button>
        </EmptyState>
      )
    }

    if (!result) {
      return (
        <div className="space-y-3 p-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }

    if (result.totalElements === 0) {
      if (gradeId !== '') return <EmptyState icon={Boxes} title={t('lots.table.noResults')} />
      if (status === 'active') return <EmptyState icon={Boxes} title={t('lots.table.noActive')} />
      return <EmptyState icon={Boxes} title={status === 'all' ? t('lots.table.empty') : t('lots.table.noResults')} />
    }

    // Short numbers stay on one line; headers and money may wrap so all columns fit on a laptop.
    const cell = 'px-2 py-3'
    const oneLine = `${cell} whitespace-nowrap`

    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs text-muted">
              <tr>
                {['lot', 'grade', 'status', 'dates', 'fill', 'sold', 'lost', 'inStock', 'members', 'saleAmount'].map(
                  (column) => (
                    <th key={column} className="px-2 py-3 align-bottom font-semibold">
                      {t(`lots.table.${column}`)}
                    </th>
                  ),
                )}
                <th className="px-3 py-3">
                  <span className="sr-only">{t('lots.actions.column')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {result.content.map((lot) => (
                <tr key={lot.id}>
                  <td className={`${oneLine} font-mono font-medium text-text`}>{lot.code}</td>
                  <td className={cell}>
                    <GradeName name={lot.gradeName} />
                  </td>
                  <td className={cell}>
                    <LotStatusBadge status={lot.status} olderLot={lot.olderLot} />
                  </td>
                  <td className={`${cell} text-xs text-muted`}>
                    <LotDatesStacked lot={lot} />
                  </td>
                  <td className={cell}>
                    <LotFill lot={lot} />
                  </td>
                  <td className={oneLine}>{formatKg(lot.soldKg)}</td>
                  <td className={`${oneLine} ${Number(lot.lostKg) > 0 ? 'text-danger' : ''}`}>{formatKg(lot.lostKg)}</td>
                  <td className={`${oneLine} font-medium`}>{formatKg(lot.remainingKg)}</td>
                  <td className={cell}>{lot.memberCount}</td>
                  <td className={cell}>
                    <SaleAmount amount={lot.saleAmountRwf} />
                  </td>
                  <td className="px-1 py-1 text-right">
                    <LotActionsMenu lot={lot} onRecordLoss={onRecordLoss} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-text/5 md:hidden">
          {result.content.map((lot) => (
            <li key={lot.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-text">{lot.code}</span>
                <LotStatusBadge status={lot.status} olderLot={lot.olderLot} />
                <div className="ml-auto -mr-2">
                  <LotActionsMenu lot={lot} onRecordLoss={onRecordLoss} />
                </div>
              </div>
              <div>
                <p className="mt-0.5 text-sm text-text">
                  <GradeName name={lot.gradeName} />
                </p>
                <p className="text-xs text-muted">
                  <LotDates lot={lot} />
                </p>
                <div className="mt-2 text-sm">
                  <span className="text-muted">{t('lots.table.fill')}: </span>
                  <LotFill lot={lot} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">{t('lots.table.inStock')}</dt>
                    <dd className="font-medium">{formatKg(lot.remainingKg)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">{t('lots.table.sold')}</dt>
                    <dd>{formatKg(lot.soldKg)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">{t('lots.table.lost')}</dt>
                    <dd className={Number(lot.lostKg) > 0 ? 'text-danger' : undefined}>{formatKg(lot.lostKg)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">{t('lots.table.members')}</dt>
                    <dd>{lot.memberCount}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">{t('lots.table.saleAmount')}</dt>
                    <dd>
                      <SaleAmount amount={lot.saleAmountRwf} />
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ul>

        <Pagination
          result={result}
          onPageChange={setPage}
          className="border-t border-text/5 bg-background/60 px-4 py-3"
        />
      </div>
    )
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl bg-surface shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold text-text">{t('lots.table.title')}</h2>
          <p className="text-sm text-muted">{t('lots.table.subtitle')}</p>
        </div>
        <div className="-mr-2 ml-auto flex flex-wrap items-center justify-end gap-x-1">
          <FilterMenu
            name={t('lots.filters.status')}
            value={status}
            defaultValue="active"
            options={STATUS_FILTERS.map((value) => ({
              value,
              label: value === 'active' ? t('lots.filters.active') : value === 'all' ? t('lots.filters.all') : lotStatusLabel(t, value),
            }))}
            valueLabel={filterValue}
            onChange={(value) => {
              setStatus(value)
              setPage(0)
            }}
          />
          <FilterMenu
            name={t('lots.filters.grade')}
            value={gradeId}
            defaultValue=""
            options={[
              { value: '', label: t('lots.filters.all') },
              ...grades.map((grade) => ({ value: String(grade.id), label: gradeName(grade.name) })),
            ]}
            valueLabel={filterValue}
            onChange={(value) => {
              setGradeId(value)
              setPage(0)
            }}
          />
        </div>
      </div>
      {renderBody()}
    </section>
  )
}
