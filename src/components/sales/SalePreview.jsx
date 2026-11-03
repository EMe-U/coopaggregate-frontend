import { useTranslation } from 'react-i18next'
import { CircleAlert, RotateCcw, SkipForward, TriangleAlert } from 'lucide-react'
import useGradeName from '../../hooks/useGradeName'
import { formatKg, formatMoney } from '../../utils/format'
import SaleBatchesTable from './SaleBatchesTable'

export const MAX_SKIPPED = 50
export const SKIP_REASON_MIN = 10
export const SKIP_REASON_MAX = 500

// The reason is required as soon as one lot is skipped.
export function skipReasonError(t, skip) {
  if (skip.lots.length === 0) return ''
  const length = skip.reason.trim().length
  if (length < SKIP_REASON_MIN) return t('sales.preview.skipReasonShort', { min: SKIP_REASON_MIN })
  if (length > SKIP_REASON_MAX) return t('sales.preview.skipReasonLong', { max: SKIP_REASON_MAX })
  return ''
}

function Total({ label, value, strong }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-lg ${strong ? 'font-semibold text-text' : 'text-text'}`}>{value}</p>
    </div>
  )
}

// One grade of the sale: the lots the backend would take, first in first out, with each member's
// part. preview is { status: 'loading' | 'done' | 'error', data, message }; skip is { lots, reason }
// with the skipped lots as { lotId, lotCode }, so they can be used again even when the preview
// failed.
export default function SalePreview({ item, preview, skip, disabled, onSkip, onUnskip, onReasonChange }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const key = 'sales.preview'
  const data = preview?.data
  const reasonError = skipReasonError(t, skip)
  const reasonId = `skip-reason-${item.key}`
  const sellableOf = (lotId) => data?.skipped?.find((lot) => lot.lotId === lotId)?.sellableKg

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
            <SaleBatchesTable
              batches={data.batches}
              kgField="takeKg"
              withDelivered
              renderLotAction={(lot) => (
                <button
                  type="button"
                  onClick={() => onSkip({ lotId: lot.lotId, lotCode: lot.lotCode })}
                  disabled={disabled || skip.lots.length >= MAX_SKIPPED}
                  title={skip.lots.length >= MAX_SKIPPED ? t(`${key}.skipLimit`, { max: MAX_SKIPPED }) : t(`${key}.skipHint`)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted hover:bg-background hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SkipForward size={14} />
                  {t(`${key}.skipLot`)}
                </button>
              )}
            />
          )}
        </>
      )}

      {preview && preview.status !== 'loading' && skip.lots.length > 0 && (
        <div className="space-y-3 rounded-lg bg-background p-3">
          <p className="text-sm font-medium text-text">{t(`${key}.skippedTitle`, { count: skip.lots.length })}</p>
          <ul className="flex flex-wrap gap-2">
            {skip.lots.map((lot) => (
              <li key={lot.lotId} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-1 text-xs">
                <span className="font-mono">{lot.lotCode}</span>
                {sellableOf(lot.lotId) != null && <span className="text-muted">{formatKg(sellableOf(lot.lotId))}</span>}
                <button
                  type="button"
                  onClick={() => onUnskip(lot.lotId)}
                  disabled={disabled}
                  className="inline-flex min-h-9 items-center gap-1 font-medium text-primary hover:underline"
                >
                  <RotateCcw size={12} />
                  {t(`${key}.useAgain`)}
                </button>
              </li>
            ))}
          </ul>
          <div>
            <label htmlFor={reasonId} className="mb-1.5 block text-sm font-medium text-text">
              {t(`${key}.skipReason`)}
            </label>
            <textarea
              id={reasonId}
              rows={2}
              maxLength={SKIP_REASON_MAX}
              value={skip.reason}
              onChange={(event) => onReasonChange(event.target.value)}
              disabled={disabled}
              placeholder={t(`${key}.skipReasonPlaceholder`)}
              aria-invalid={Boolean(reasonError)}
              aria-describedby={`${reasonId}-count`}
              className="w-full rounded-lg border border-transparent bg-surface px-3 py-2 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs">
              <span className="text-danger">{reasonError}</span>
              <span id={`${reasonId}-count`} className="text-muted">
                {t(`${key}.counter`, { count: skip.reason.trim().length, max: SKIP_REASON_MAX })}
              </span>
            </div>
          </div>
        </div>
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
