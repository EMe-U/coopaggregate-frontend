import { useTranslation } from 'react-i18next'
import { CircleCheck, HandCoins, TriangleAlert } from 'lucide-react'
import useGradeName from '../../hooks/useGradeName'
import { formatKg, formatMoney } from '../../utils/format'
import SaleBatchesTable from './SaleBatchesTable'

// result is { code, buyerName, totalKg, totalAmountRwf, sales } for one sale or one order. The
// batches are the ones the backend really used, which can differ from the preview if something
// changed in between.
export default function SaleResult({ result, onRecordAnother }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const belowFloor = result.sales.some((sale) => sale.belowFloor)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-primary-light p-4 text-primary">
        <CircleCheck size={22} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{t('sales.result.title', { code: result.code })}</p>
          <p className="text-2xl font-semibold">{t('sales.result.total', { amount: formatMoney(result.totalAmountRwf) })}</p>
          <p className="text-sm">
            {result.buyerName} · {formatKg(result.totalKg)}
          </p>
        </div>
      </div>
      {belowFloor && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          {t('sales.result.belowFloor')}
        </p>
      )}

      {result.sales.map((sale) => (
        <section key={sale.id} className="min-w-0 space-y-3 rounded-lg border border-text/10 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold text-text">
              <span className="font-mono text-primary">{sale.saleCode}</span> · {gradeName(sale.gradeName)}
            </h3>
            <p className="text-sm text-muted">
              {t('sales.result.saleLine', {
                kg: formatKg(sale.quantityKg),
                price: formatMoney(sale.pricePerKg),
                total: formatMoney(sale.totalAmountRwf),
              })}
            </p>
          </div>
          <SaleBatchesTable batches={sale.batches} withMoney />
          {sale.totalNetRwf != null && (
            <p className="text-sm text-muted">
              {t('sales.result.credited', {
                net: formatMoney(sale.totalNetRwf),
                deduction: formatMoney(sale.totalDeductionRwf),
                count: sale.batches.length,
              })}
            </p>
          )}
        </section>
      ))}

      <button
        type="button"
        onClick={onRecordAnother}
        className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
      >
        <HandCoins size={16} />
        {t('sales.result.recordAnother')}
      </button>
    </div>
  )
}
