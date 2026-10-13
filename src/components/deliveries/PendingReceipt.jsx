import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudOff, Plus, Printer } from 'lucide-react'
import { formatDateTime, formatKg, formatMoney } from '../../utils/format'
import { previewDeduction } from '../../utils/deduction'
import { temporaryReference } from '../../offline/pending'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-text">{children}</dd>
    </div>
  )
}

// The server gives the receipt code, the lot and the deduction, so until the delivery syncs the
// receipt shows a temporary reference and the deduction preview.
export default function PendingReceipt({ delivery, onRecordAnother }) {
  const { t } = useTranslation()
  const cardRef = useRef(null)

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [delivery.clientUuid])

  const failed = delivery.status === 'FAILED'

  return (
    <section
      ref={cardRef}
      className={`rounded-xl border-t-4 bg-surface p-5 shadow-sm print:border-0 print:shadow-none ${
        failed ? 'border-danger' : 'border-warning'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <CloudOff size={18} className={failed ? 'text-danger' : 'text-warning'} />
          {failed ? t('offline.receipt.failed') : t('offline.receipt.waiting')}
        </h2>
        <span className="rounded-md bg-background px-2 py-1 font-mono text-sm font-semibold text-text">
          {temporaryReference(delivery.clientUuid)}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">{failed ? delivery.lastError : t('offline.receipt.explanation')}</p>

      <dl className="mt-4 divide-y divide-text/5 text-sm">
        <Row label={t('deliveries.receipt.member')}>
          {delivery.memberName}
          <span className="block text-xs font-normal text-muted">{delivery.memberNumber}</span>
        </Row>
        <Row label={t('deliveries.receipt.dateTime')}>{formatDateTime(delivery.payload.deliveredAt)}</Row>
        <Row label={t('offline.receipt.grade')}>
          {t(`grades.${delivery.gradeName}`, { defaultValue: delivery.gradeName })}
          <span className="block text-xs font-normal text-muted">{t('offline.receipt.lotLater')}</span>
        </Row>
        <Row label={t('deliveries.receipt.quantity')}>{formatKg(delivery.payload.quantityKg)}</Row>
        <Row label={t('offline.receipt.deductionPreview')}>
          {formatMoney(previewDeduction(delivery.payload.quantityKg))}
        </Row>
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-background text-sm font-medium text-text hover:bg-text/10"
        >
          <Printer size={16} />
          {t('deliveries.receipt.print')}
        </button>
        <button
          type="button"
          onClick={onRecordAnother}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus size={16} />
          {t('deliveries.receipt.recordAnother')}
        </button>
      </div>
    </section>
  )
}
