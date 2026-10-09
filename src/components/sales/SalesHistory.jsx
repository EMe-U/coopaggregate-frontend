import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listSales } from '../../api/sales'
import Pagination from '../Pagination'
import { formatDate, formatKg, formatMoney } from '../../utils/format'

const PAGE_SIZE = 10

export default function SalesHistory({ reloadKey }) {
  const { t } = useTranslation()

  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    listSales({ page, size: PAGE_SIZE })
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
  }, [page, reloadKey, retryKey])

  const cell = 'whitespace-nowrap px-3 py-3'

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
                  {['saleId', 'date', 'buyer', 'lot', 'kg', 'pricePerKg', 'total'].map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {t(`sales.history.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-text/5">
                {result.content.map((sale) => (
                  <tr key={sale.id}>
                    <td className={`${cell} font-mono font-medium text-primary`}>{sale.saleCode}</td>
                    <td className={cell}>{formatDate(sale.soldAt)}</td>
                    <td className={cell}>{sale.buyerName}</td>
                    <td className={`${cell} font-mono text-xs`}>
                      <Link to={`/lots/${sale.lotId}`} className="text-primary hover:underline">
                        {sale.lotCode}
                      </Link>
                    </td>
                    <td className={cell}>{formatKg(sale.quantityKg)}</td>
                    <td className={cell}>{formatMoney(sale.pricePerKg)}</td>
                    <td className={`${cell} font-medium`}>{formatMoney(sale.totalAmountRwf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              summary={t('sales.history.showing', {
                from: result.page * result.size + 1,
                to: result.page * result.size + result.content.length,
                total: result.totalElements,
              })}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </section>
  )
}
