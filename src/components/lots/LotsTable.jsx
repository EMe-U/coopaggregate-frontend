import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Boxes } from 'lucide-react'
import { listGrades } from '../../api/grades'
import { listLots } from '../../api/lots'
import EmptyState from '../EmptyState'
import GradeName from '../GradeName'
import Pagination from '../Pagination'
import LotStatusBadge from './LotStatusBadge'
import { formatDate, formatKg, formatMoney } from '../../utils/format'

const PAGE_SIZE = 10
const STATUSES = ['OPEN', 'CLOSED', 'SOLD', 'SHARED']

const selectClass =
  'min-h-11 rounded-lg border border-transparent bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

function LotDates({ lot }) {
  const { t } = useTranslation()
  return lot.closedAt
    ? t('lots.table.period', { from: formatDate(lot.createdAt), to: formatDate(lot.closedAt) })
    : t('lots.table.openSince', { date: formatDate(lot.createdAt) })
}

function SaleAmount({ amount }) {
  return amount ? formatMoney(amount) : <span className="text-muted">–</span>
}

export default function LotsTable({ reloadKey }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [grades, setGrades] = useState([])
  const [status, setStatus] = useState('')
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
    listLots({ status, gradeId, page, size: PAGE_SIZE })
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
  }, [status, gradeId, page, reloadKey, retryKey])

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
      const filtered = status !== '' || gradeId !== ''
      return <EmptyState icon={Boxes} title={filtered ? t('lots.table.noResults') : t('lots.table.empty')} />
    }

    const cell = 'whitespace-nowrap px-3 py-3'
    const from = result.page * result.size + 1

    return (
      <div className={loading ? 'opacity-60' : undefined}>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-muted">
              <tr>
                {['lot', 'grade', 'status', 'dates', 'delivered', 'sold', 'lost', 'inStock', 'members', 'saleAmount'].map(
                  (column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold">
                      {t(`lots.table.${column}`)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {result.content.map((lot) => (
                <tr
                  key={lot.id}
                  onClick={() => navigate(`/lots/${lot.id}`)}
                  className="cursor-pointer hover:bg-background/60"
                >
                  <td className={`${cell} font-mono font-medium`}>
                    <Link to={`/lots/${lot.id}`} className="text-primary hover:underline">
                      {lot.code}
                    </Link>
                  </td>
                  <td className={cell}>
                    <GradeName name={lot.gradeName} />
                  </td>
                  <td className={cell}>
                    <LotStatusBadge status={lot.status} />
                  </td>
                  <td className={`${cell} text-xs text-muted`}>
                    <LotDates lot={lot} />
                  </td>
                  <td className={cell}>{formatKg(lot.deliveredKg)}</td>
                  <td className={cell}>{formatKg(lot.soldKg)}</td>
                  <td className={`${cell} ${Number(lot.lostKg) > 0 ? 'text-danger' : ''}`}>{formatKg(lot.lostKg)}</td>
                  <td className={`${cell} font-medium`}>{formatKg(lot.remainingKg)}</td>
                  <td className={cell}>{lot.memberCount}</td>
                  <td className={cell}>
                    <SaleAmount amount={lot.saleAmountRwf} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-text/5 md:hidden">
          {result.content.map((lot) => (
            <li key={lot.id}>
              <Link to={`/lots/${lot.id}`} className="block p-4 hover:bg-background/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-medium text-primary">{lot.code}</span>
                  <LotStatusBadge status={lot.status} />
                </div>
                <p className="mt-0.5 text-sm text-text">
                  <GradeName name={lot.gradeName} />
                </p>
                <p className="text-xs text-muted">
                  <LotDates lot={lot} />
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">{t('lots.table.delivered')}</dt>
                    <dd>{formatKg(lot.deliveredKg)}</dd>
                  </div>
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
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-t border-text/5 bg-background/60 px-4 py-3">
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            summary={t('lots.table.showing', {
              from,
              to: from + result.content.length - 1,
              total: result.totalElements,
            })}
            onPageChange={setPage}
          />
        </div>
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
        <div className="flex flex-wrap gap-2">
          <select
            aria-label={t('lots.filters.status')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(0)
            }}
            className={selectClass}
          >
            <option value="">
              {t('lots.filters.status')}: {t('lots.filters.all')}
            </option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`lots.status.${value}`)}
              </option>
            ))}
          </select>
          <select
            aria-label={t('lots.filters.grade')}
            value={gradeId}
            onChange={(event) => {
              setGradeId(event.target.value)
              setPage(0)
            }}
            className={selectClass}
          >
            <option value="">
              {t('lots.filters.grade')}: {t('lots.filters.all')}
            </option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {t(`grades.${grade.name}`, { defaultValue: grade.name })}
              </option>
            ))}
          </select>
        </div>
      </div>
      {renderBody()}
    </section>
  )
}
