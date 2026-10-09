import { useTranslation } from 'react-i18next'
import { Banknote, ReceiptText, Truck } from 'lucide-react'
import { formatDate, formatKg, formatMoney } from '../../utils/format'

// Deliveries, lot shares and payments are not loaded yet, so every section shows its empty
// state and the summary shows no amounts. Row field names follow the backend entities and
// must be checked when those endpoints are built. Totals come from the backend as well.

function SummaryBox({ label, note }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg bg-white/10 p-4">
      <p className="text-xs text-white/70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{t('members.statement.noValue')}</p>
      {note && <p className="mt-0.5 text-xs text-white/60">{note}</p>}
    </div>
  )
}

export function FinancialSummaryCard() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-xl bg-primary p-6 text-white shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          {t('members.statement.summaryTitle')}
        </p>
        <p className="mt-2 text-3xl font-semibold">{t('members.statement.noValue')}</p>
        <p className="mt-1 text-sm text-white/70">{t('members.statement.netAmount')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryBox label={t('members.statement.grossShare')} note={t('members.statement.grossShareNote')} />
        <SummaryBox label={t('members.statement.deductions')} note={t('members.statement.deductionsNote')} />
        <SummaryBox label={t('members.statement.paidOut')} />
      </div>
    </div>
  )
}

function StatementSection({ icon: Icon, title, subtitle, columns, rows, renderRow, totalsRow, emptyMessage }) {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <Icon size={18} className="text-primary" />
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map(renderRow)
            )}
          </tbody>
          {rows.length > 0 && totalsRow && (
            <tfoot className="border-t-2 border-text/10 font-semibold">{totalsRow}</tfoot>
          )}
        </table>
      </div>
    </section>
  )
}

function GradeName({ name }) {
  const { t } = useTranslation()
  // Grade names come from the grade table; unknown names are shown as they are.
  return t(`members.statement.grades.${name}`, { defaultValue: name })
}

function DeliveriesSection({ deliveries = [], totals }) {
  const { t } = useTranslation()
  const key = 'members.statement.deliveries'
  const cell = 'whitespace-nowrap px-3 py-2'

  return (
    <StatementSection
      icon={Truck}
      title={t(`${key}.title`)}
      columns={['date', 'receiptCode', 'grade', 'lot', 'kg', 'deduction'].map((column) => t(`${key}.${column}`))}
      rows={deliveries}
      renderRow={(delivery) => (
        <tr key={delivery.id}>
          <td className={cell}>{formatDate(delivery.deliveredAt?.slice(0, 10))}</td>
          <td className={`${cell} font-mono text-xs`}>{delivery.receiptCode}</td>
          <td className={cell}>
            <GradeName name={delivery.gradeName} />
          </td>
          <td className={cell}>{delivery.lotCode}</td>
          <td className={cell}>{formatKg(delivery.quantityKg)}</td>
          <td className={cell}>{formatMoney(delivery.deductionAmount)}</td>
        </tr>
      )}
      totalsRow={
        totals && (
          <tr>
            <td colSpan={4} className={cell}>
              {t(`${key}.total`)}
            </td>
            <td className={cell}>{formatKg(totals.totalKg)}</td>
            <td className={cell}>{formatMoney(totals.totalDeduction)}</td>
          </tr>
        )
      }
      emptyMessage={t(`${key}.empty`)}
    />
  )
}

function LotSharesSection({ lotShares = [] }) {
  const { t } = useTranslation()
  const key = 'members.statement.lotShares'
  const cell = 'whitespace-nowrap px-3 py-2'

  return (
    <StatementSection
      icon={Banknote}
      title={t(`${key}.title`)}
      columns={['lot', 'memberKg', 'lotKg', 'sharePercent', 'shareOfMoney'].map((column) => t(`${key}.${column}`))}
      rows={lotShares}
      renderRow={(share) => (
        <tr key={share.id}>
          <td className={cell}>{share.lotCode}</td>
          <td className={cell}>{formatKg(share.memberKg)}</td>
          <td className={cell}>{formatKg(share.lotKg)}</td>
          <td className={cell}>{share.sharePercent}%</td>
          <td className={cell}>
            {/* A lot that is not sold yet has no money to share. */}
            {share.shareAmount == null ? (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-amber-700">
                {t(`${key}.waitingForSale`)}
              </span>
            ) : (
              formatMoney(share.shareAmount)
            )}
          </td>
        </tr>
      )}
      emptyMessage={t(`${key}.empty`)}
    />
  )
}

function PaymentsSection({ payments = [] }) {
  const { t } = useTranslation()
  const key = 'members.statement.payments'
  const cell = 'whitespace-nowrap px-3 py-2'

  return (
    <StatementSection
      icon={ReceiptText}
      title={t(`${key}.title`)}
      subtitle={t(`${key}.subtitle`)}
      columns={['date', 'amountPaid', 'method', 'referenceCode'].map((column) => t(`${key}.${column}`))}
      rows={payments}
      renderRow={(payment) => (
        <tr key={payment.id}>
          <td className={cell}>{formatDate(payment.paymentDate)}</td>
          <td className={cell}>{formatMoney(payment.amount)}</td>
          <td className={cell}>{t(`${key}.methods.${payment.method}`)}</td>
          <td className={`${cell} font-mono text-xs`}>{payment.referenceNo}</td>
        </tr>
      )}
      emptyMessage={t(`${key}.empty`)}
    />
  )
}

export function StatementSections() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <DeliveriesSection />
        <LotSharesSection />
      </div>
      <PaymentsSection />
    </>
  )
}
