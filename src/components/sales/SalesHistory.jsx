import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { listSales } from '../../api/sales'
import GradeName from '../GradeName'
import Pagination from '../Pagination'
import usePageSize from '../../hooks/usePageSize'
import { formatDate, formatKg, formatMoney } from '../../utils/format'
import SaleBatchesTable from './SaleBatchesTable'

const cell = 'whitespace-nowrap px-3 py-3'
const COLUMNS = ['saleId', 'date', 'buyer', 'grade', 'kg', 'pricePerKg', 'total', 'batches']

// Sales come newest first, so the lines of one order sit next to each other. Older sales without
// an order stay on their own. An order cut by the page edge continues on the next page.
function groupByOrder(sales) {
  const groups = []
  for (const sale of sales) {
    const last = groups.at(-1)
    if (sale.orderCode && last?.orderCode === sale.orderCode) last.sales.push(sale)
    else groups.push({ orderCode: sale.orderCode, sales: [sale] })
  }
  return groups
}

// A sale from before sales by grade has no money per batch (totalNetRwf is null): its members are
// paid through the lot share. Only those sales have a lot of their own.
function isLotSale(sale) {
  return sale.totalNetRwf == null
}

// Lines of an order leave out the date and buyer, which their order row already shows.
function SaleRow({ sale, inOrder, open, onToggle }) {
  const { t } = useTranslation()
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <tr>
      <td className={`${cell} font-mono ${inOrder ? 'pl-7 text-xs text-muted' : 'font-medium text-primary'}`}>
        {sale.saleCode}
      </td>
      <td className={cell}>{inOrder ? '' : formatDate(sale.soldAt)}</td>
      <td className={cell}>{inOrder ? '' : sale.buyerName}</td>
      <td className={cell}>
        <GradeName name={sale.gradeName} />
        {sale.lotCode && (
          <Link to={`/lots/${sale.lotId}`} className="block font-mono text-xs text-primary hover:underline">
            {sale.lotCode}
          </Link>
        )}
      </td>
      <td className={cell}>{formatKg(sale.quantityKg)}</td>
      <td className={cell}>{formatMoney(sale.pricePerKg)}</td>
      <td className={`${cell} font-medium`}>{formatMoney(sale.totalAmountRwf)}</td>
      <td className="px-3 py-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-primary-light"
        >
          <Chevron size={16} />
          {t('sales.history.batchCount', { count: sale.batches.length })}
        </button>
      </td>
    </tr>
  )
}

function SaleBatchesRow({ sale }) {
  const { t } = useTranslation()
  return (
    <tr className="bg-background/40">
      <td colSpan={COLUMNS.length} className="px-3 py-3">
        {isLotSale(sale) && (
          <p className="mb-2 text-sm text-muted">{t('sales.history.paidByLotShare', { lot: sale.lotCode ?? '–' })}</p>
        )}
        {sale.batches.length === 0 ? (
          <p className="text-sm text-muted">{t('sales.history.noBatches')}</p>
        ) : (
          <SaleBatchesTable batches={sale.batches} withMoney paidByLotShare={isLotSale(sale)} />
        )}
        {!isLotSale(sale) && (
          <p className="mt-2 text-sm text-muted">
            {t('sales.result.credited', {
              net: formatMoney(sale.totalNetRwf),
              deduction: formatMoney(sale.totalDeductionRwf),
              count: sale.batches.length,
            })}
          </p>
        )}
      </td>
    </tr>
  )
}

export default function SalesHistory({ reloadKey }) {
  const { t } = useTranslation()
  const pageSize = usePageSize()

  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  // The sales whose batches are shown.
  const [openIds, setOpenIds] = useState(() => new Set())

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    listSales({ page, size: pageSize })
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
  }, [page, pageSize, reloadKey, retryKey])

  function toggle(id) {
    setOpenIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderSale(sale, inOrder) {
    const open = openIds.has(sale.id)
    return (
      <Fragment key={sale.id}>
        <SaleRow sale={sale} inOrder={inOrder} open={open} onToggle={() => toggle(sale.id)} />
        {open && <SaleBatchesRow sale={sale} />}
      </Fragment>
    )
  }

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-text">{t('sales.history.title')}</h2>

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {t('sales.history.error')}
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 font-medium underline"
          >
            {t('sales.history.retry')}
          </button>
        </div>
      )}

      {!loadError && !result && (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )}

      {!loadError && result?.totalElements === 0 && (
        <p className="py-8 text-center text-sm text-muted">{t('sales.history.empty')}</p>
      )}

      {!loadError && result?.totalElements > 0 && (
        <div className={loading ? 'opacity-60' : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {t(`sales.history.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-text/5">
                {groupByOrder(result.content).map((group) =>
                  group.orderCode ? (
                    <Fragment key={group.orderCode}>
                      <tr className="bg-background/60">
                        <td className={`${cell} font-mono font-semibold text-primary`}>{group.orderCode}</td>
                        <td className={cell}>{formatDate(group.sales[0].soldAt)}</td>
                        <td className={cell}>{group.sales[0].buyerName}</td>
                        <td colSpan={COLUMNS.length - 3} className={`${cell} text-muted`}>
                          {t('sales.history.orderLines', { count: group.sales.length })}
                        </td>
                      </tr>
                      {group.sales.map((sale) => renderSale(sale, true))}
                    </Fragment>
                  ) : (
                    renderSale(group.sales[0], false)
                  ),
                )}
              </tbody>
            </table>
          </div>
          <Pagination result={result} onPageChange={setPage} className="mt-3" />
        </div>
      )}
    </section>
  )
}
