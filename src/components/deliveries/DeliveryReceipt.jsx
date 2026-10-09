import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Printer, ReceiptText, User } from 'lucide-react'
import GradeName from '../GradeName'
import { formatDateTime, formatKg, formatMoney } from '../../utils/format'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-text">{children}</dd>
    </div>
  )
}

// Shows the delivery exactly as the backend saved it, including the deduction it calculated.
export default function DeliveryReceipt({ delivery, onRecordAnother }) {
  const { t } = useTranslation()
  const cardRef = useRef(null)

  // On a phone the receipt sits below the form, so bring it into view after saving.
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [delivery.id])

  return (
    <section
      ref={cardRef}
      className="rounded-xl border-t-4 border-primary bg-surface p-5 shadow-sm print:border-0 print:shadow-none"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <ReceiptText size={18} className="text-primary" />
          {t('deliveries.receipt.title')}
        </h2>
        <span className="rounded-md bg-primary-light px-2 py-1 font-mono text-sm font-semibold text-primary">
          {delivery.receiptCode}
        </span>
      </div>

      <dl className="mt-4 divide-y divide-text/5 text-sm">
        <Row label={t('deliveries.receipt.member')}>
          {delivery.memberName}
          <span className="block text-xs font-normal text-muted">{delivery.memberNumber}</span>
        </Row>
        <Row label={t('deliveries.receipt.dateTime')}>{formatDateTime(delivery.deliveredAt)}</Row>
        <Row label={t('deliveries.receipt.gradeLot')}>
          {t('deliveries.receipt.gradeLotValue', {
            grade: t(`grades.${delivery.gradeName}`, { defaultValue: delivery.gradeName }),
            lot: delivery.lotCode,
          })}
        </Row>
        <Row label={t('deliveries.receipt.quantity')}>{formatKg(delivery.quantityKg)}</Row>
        <Row label={t('deliveries.receipt.deduction')}>{formatMoney(delivery.deductionRwf)}</Row>
      </dl>

      <div className="mt-5 grid gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-background text-sm font-medium text-text hover:bg-text/10"
        >
          <Printer size={16} />
          {t('deliveries.receipt.print')}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRecordAnother}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90"
          >
            <Plus size={16} />
            {t('deliveries.receipt.recordAnother')}
          </button>
          <Link
            to={`/members/${delivery.memberId}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-text/10 text-sm font-medium text-text hover:bg-background"
          >
            <User size={16} />
            {t('deliveries.receipt.viewMember')}
          </Link>
        </div>
      </div>
    </section>
  )
}
