import { useTranslation } from 'react-i18next'
import { Banknote, ReceiptText, Truck } from 'lucide-react'

// The amounts and tables below will be filled from the backend once deliveries,
// lot shares and payments exist. Until then they show empty values on purpose.

function SummaryBox({ label, note }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg bg-white/10 p-4">
      <p className="text-xs text-white/70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{t('members.statement.noValue')}</p>
      <p className="mt-0.5 text-xs text-white/60">{note}</p>
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
        <SummaryBox label={t('members.statement.paidOut')} note={t('members.statement.paidOutNote')} />
      </div>
    </div>
  )
}

function StatementSection({ icon: Icon, title, subtitle, columns, emptyMessage }) {
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
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-muted">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function StatementSections() {
  const { t } = useTranslation()
  const deliveries = 'members.statement.deliveries'
  const lotShares = 'members.statement.lotShares'
  const payments = 'members.statement.payments'

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <StatementSection
          icon={Truck}
          title={t(`${deliveries}.title`)}
          columns={['date', 'receiptCode', 'grade', 'lot', 'kg', 'deduction'].map((key) => t(`${deliveries}.${key}`))}
          emptyMessage={t(`${deliveries}.empty`)}
        />
        <StatementSection
          icon={Banknote}
          title={t(`${lotShares}.title`)}
          columns={['lot', 'memberKg', 'lotKg', 'sharePercent', 'shareOfMoney'].map((key) => t(`${lotShares}.${key}`))}
          emptyMessage={t(`${lotShares}.empty`)}
        />
      </div>
      <StatementSection
        icon={ReceiptText}
        title={t(`${payments}.title`)}
        subtitle={t(`${payments}.subtitle`)}
        columns={['date', 'amountPaid', 'method', 'referenceCode', 'status'].map((key) => t(`${payments}.${key}`))}
        emptyMessage={t(`${payments}.empty`)}
      />
    </>
  )
}
