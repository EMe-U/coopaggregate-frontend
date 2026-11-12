import { useTranslation } from 'react-i18next'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import useGradeName from '../../hooks/useGradeName'
import { formatKg, formatMoney } from '../../utils/format'
import SaleBatchesTable from './SaleBatchesTable'

function Total({ label, value, strong }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-lg ${strong ? 'font-semibold text-text' : 'text-text'}`}>{value}</p>
    </div>
  )
}

// One grade of the sale: the lots the backend would take, always the oldest first, with each
// member's part. preview is { status: 'loading' | 'done' | 'error', data, message }.
export default function SalePreview({ item, preview }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const key = 'sales.preview'
  const data = preview?.data

  return (
    <section className="min-w-0 space-y-4 rounded-lg border border-text/10 p-4">
      <h3 className="font-semibold text-text">
        {t(`${key}.itemTitle`, {
          grade: gradeName(item.grade.name),
          kg: formatKg(item.check.kg),
          price: formatMoney(item.check.price),
        })}
      </h3>

      {(!preview || preview.status === 'loading') && <div className="h-32 animate-pulse rounded-lg bg-background" />}

      {preview?.status === 'error' && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          {preview.message}
        </p>
      )}

      {preview?.status === 'done' && data && (
        <>
          <p className="text-sm text-muted">
            {t(`${key}.stock`, {
              sellable: formatKg(data.sellableKg),
              waiting: formatKg(data.waitingConfirmationKg),
              disputed: formatKg(data.disputedKg),
            })}
          </p>

          {!data.enough && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              {data.message}
            </p>
          )}
          {data.enough && data.belowFloorPrice && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              {t(`${key}.belowFloor`)}
            </p>
          )}

          {data.batches.length > 0 && (
            <SaleBatchesTable batches={data.batches} kgField="takeKg" withDelivered />
          )}
        </>
      )}

      {preview?.status === 'done' && data?.enough && (
        <div className="flex flex-wrap gap-6 rounded-lg bg-background p-3">
          <Total label={t(`${key}.totalAmount`)} value={formatMoney(data.totalAmountRwf)} strong />
          <Total
            label={t(`${key}.totalDeduction`, { perKg: formatMoney(data.deductionPerKg) })}
            value={formatMoney(data.totalDeductionRwf)}
          />
          <Total label={t(`${key}.totalNet`)} value={formatMoney(data.totalNetRwf)} strong />
        </div>
      )}
    </section>
  )
}
