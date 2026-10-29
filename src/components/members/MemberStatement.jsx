import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, HandCoins, ReceiptText, Truck } from 'lucide-react'
import { listDeliveries } from '../../api/deliveries'
import { formatDate, formatDay, formatKg, formatMoney, kigaliIsoDate } from '../../utils/format'
import GradeName from '../GradeName'
import Pagination from '../Pagination'
import usePageSize from '../../hooks/usePageSize'
import useLinkedDeliveries from '../../hooks/useLinkedDeliveries'
import useLotsWithSales from '../../hooks/useLotsWithSales'
import ConfirmationBadge from '../deliveries/ConfirmationBadge'
import DeliveryActionsMenu from '../deliveries/DeliveryActionsMenu'
import DeliveryHistoryNote, { deliveryRowId } from '../deliveries/DeliveryHistoryNote'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { loadWithCache } from '../../offline/cache'

// Deliveries come from the deliveries API; the summary, lot shares, sale credits and payments come
// from the member statement. Every amount is calculated by the backend, never by adding up money here.

function SummaryBox({ label, value, note }) {
  return (
    <div className="rounded-lg bg-white/10 p-4">
      <p className="text-xs text-white/70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {note && <p className="mt-0.5 text-xs text-white/60">{note}</p>}
    </div>
  )
}

// readOnly disables paying, for a statement shown without internet.
export function FinancialSummaryCard({ statement, error, onPay, readOnly }) {
  const { t } = useTranslation()
  const money = (amount) => (statement ? formatMoney(amount) : t('members.statement.noValue'))

  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-xl bg-primary p-6 text-white shadow-sm print:break-inside-avoid">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          {t('members.statement.summaryTitle')}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-3xl font-semibold">{money(statement?.owedRwf)}</p>
          {statement?.owedRwf > 0 && onPay && (
            <button
              type="button"
              onClick={onPay}
              disabled={readOnly}
              title={readOnly ? t('offline.needsInternet') : undefined}
              className="min-h-11 rounded-lg bg-white px-5 text-sm font-semibold text-primary hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
            >
              {t('members.statement.pay')}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-white/70">
          {error ? t('members.statement.error') : t('members.statement.netAmount')}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryBox
          label={t('members.statement.grossShare')}
          value={money(statement?.grossShareRwf)}
          note={t('members.statement.grossShareNote')}
        />
        <SummaryBox
          label={t('members.statement.deductions')}
          value={money(statement?.deductionsRwf)}
          note={t('members.statement.deductionsNote')}
        />
        <SummaryBox label={t('members.statement.paidOut')} value={money(statement?.paidRwf)} />
      </div>
    </div>
  )
}

function StatementSection({ icon: Icon, title, subtitle, columns, rows, renderRow, totalsRow, emptyMessage, footer }) {
  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm print:break-inside-avoid">
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
      {footer && <div className="mt-3">{footer}</div>}
    </section>
  )
}

function DeliveriesSection({ memberId, totals, onChanged }) {
  const { t } = useTranslation()
  const pageSize = usePageSize()
  const isOnline = useOnlineStatus()
  const key = 'members.statement.deliveries'
  const cell = 'whitespace-nowrap px-3 py-2'

  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setStatus('loading')
    // Without internet, the pages opened before on this device can still be shown.
    loadWithCache(`memberDeliveries:${memberId}:${page}:${pageSize}`, () =>
      listDeliveries({ memberId, includeReversed: true, page, size: pageSize }),
    )
      .then(({ data }) => {
        if (ignore) return
        setResult(data)
        setStatus('done')
      })
      .catch(() => {
        if (!ignore) setStatus('error')
      })
    return () => {
      ignore = true
    }
  }, [memberId, page, pageSize, reloadKey, isOnline])

  let emptyMessage = t(`${key}.empty`)
  if (status === 'loading' && !result) emptyMessage = t('deliveries.memberSection.loading')
  if (status === 'error') {
    emptyMessage = (
      <span className="text-danger">
        {t('deliveries.memberSection.error')}{' '}
        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="font-medium underline print:hidden"
        >
          {t('members.error.retry')}
        </button>
      </span>
    )
  }

  const deliveries = status === 'error' ? [] : (result?.content ?? [])
  const lotsWithSales = useLotsWithSales(deliveries.map((delivery) => delivery.lotId), reloadKey)
  const linked = useLinkedDeliveries(deliveries)

  // A reversal changes the statement too, so the page reloads it as well.
  function handleChanged() {
    setReloadKey((current) => current + 1)
    onChanged?.()
  }

  return (
    <StatementSection
      icon={Truck}
      title={t(`${key}.title`)}
      columns={[
        ...['date', 'receiptCode', 'grade', 'lot', 'kg', 'deduction'].map((column) => t(`${key}.${column}`)),
        t('confirmation.status'),
        t('reversal.actionsColumn'),
      ]}
      rows={deliveries}
      renderRow={(delivery) => (
        <tr
          key={delivery.id}
          id={deliveryRowId(delivery.id)}
          className={`target:bg-warning/20 ${delivery.reversed ? 'opacity-60' : ''}`}
        >
          <td className={cell}>{formatDate(kigaliIsoDate(new Date(delivery.deliveredAt)))}</td>
          <td className={`${cell} font-mono text-xs`}>
            <Link
              to={`/deliveries/${delivery.id}`}
              className={`text-primary hover:underline ${delivery.reversed ? 'line-through' : ''}`}
            >
              {delivery.receiptCode}
            </Link>
            <DeliveryHistoryNote delivery={delivery} linked={linked} />
          </td>
          <td className={cell}>
            <GradeName name={delivery.gradeName} />
          </td>
          <td className={cell}>{delivery.lotCode}</td>
          <td className={cell}>{formatKg(delivery.quantityKg)}</td>
          <td className={cell}>{formatMoney(delivery.deductionRwf)}</td>
          <td className={cell}>{!delivery.reversed && <ConfirmationBadge delivery={delivery} />}</td>
          <td className="px-3 py-1 print:hidden">
            <DeliveryActionsMenu
              delivery={delivery}
              lotHasSales={lotsWithSales.has(delivery.lotId)}
              onChanged={handleChanged}
            />
          </td>
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
            <td />
            <td className="print:hidden" />
          </tr>
        )
      }
      emptyMessage={emptyMessage}
      footer={
        deliveries.length > 0 && <Pagination result={result} onPageChange={setPage} className="print:hidden" />
      }
    />
  )
}

// Placeholder text for a statement section while the statement loads or when it failed.
function statementMessage(t, statement, error, emptyMessage) {
  if (error) return <span className="text-danger">{t('members.statement.error')}</span>
  if (!statement) return t('members.statement.loading')
  return emptyMessage
}

function ShareMoney({ share }) {
  const { t } = useTranslation()
  const key = 'members.statement.lotShares'

  if (share.status === 'SHARED') return formatMoney(share.shareRwf)
  // A sold lot has money but has not been shared yet; an open or closed lot is not sold.
  const waitingKey = share.status === 'SOLD' ? 'waitingForSharing' : 'waitingForSale'
  return (
    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-amber-700">
      {t(`${key}.${waitingKey}`)}
    </span>
  )
}

function LotSharesSection({ statement, error }) {
  const { t } = useTranslation()
  const key = 'members.statement.lotShares'
  const cell = 'whitespace-nowrap px-3 py-2'

  return (
    <StatementSection
      icon={Banknote}
      title={t(`${key}.title`)}
      columns={['lot', 'memberKg', 'lotKg', 'sharePercent', 'shareOfMoney'].map((column) => t(`${key}.${column}`))}
      rows={statement?.lotShares ?? []}
      renderRow={(share) => (
        <tr key={share.lotCode}>
          <td className={`${cell} font-mono text-xs`}>{share.lotCode}</td>
          <td className={cell}>{formatKg(share.memberKg)}</td>
          <td className={cell}>{formatKg(share.lotKg)}</td>
          <td className={cell}>{share.sharePercent == null ? '–' : `${share.sharePercent}%`}</td>
          <td className={cell}>
            <ShareMoney share={share} />
          </td>
        </tr>
      )}
      emptyMessage={statementMessage(t, statement, error, t(`${key}.empty`))}
    />
  )
}

// What each sale by grade paid the member for one of their batches, at the time of the sale.
function SaleCreditsSection({ statement, error }) {
  const { t } = useTranslation()
  const key = 'members.statement.saleCredits'
  const cell = 'whitespace-nowrap px-3 py-2'

  return (
    <StatementSection
      icon={HandCoins}
      title={t(`${key}.title`)}
      subtitle={t(`${key}.subtitle`)}
      columns={['saleCode', 'date', 'receiptCode', 'lot', 'kg', 'pricePerKg', 'gross', 'deduction', 'net'].map((column) =>
        t(`${key}.${column}`),
      )}
      rows={statement?.saleCredits ?? []}
      renderRow={(credit) => (
        <tr key={`${credit.saleCode}-${credit.receiptCode}`}>
          <td className={`${cell} font-mono text-xs`}>{credit.saleCode}</td>
          <td className={cell}>{formatDay(credit.soldAt)}</td>
          <td className={`${cell} font-mono text-xs`}>{credit.receiptCode}</td>
          <td className={`${cell} font-mono text-xs`}>{credit.lotCode}</td>
          <td className={cell}>{formatKg(credit.kg)}</td>
          <td className={cell}>{formatMoney(credit.pricePerKg)}</td>
          <td className={cell}>{formatMoney(credit.grossRwf)}</td>
          <td className={`${cell} text-muted`}>−{formatMoney(credit.deductionRwf)}</td>
          <td className={`${cell} font-semibold`}>{formatMoney(credit.netRwf)}</td>
        </tr>
      )}
      emptyMessage={statementMessage(t, statement, error, t(`${key}.empty`))}
    />
  )
}

function PaymentsSection({ statement, error }) {
  const { t } = useTranslation()
  const key = 'members.statement.payments'
  const cell = 'whitespace-nowrap px-3 py-2'

  return (
    <StatementSection
      icon={ReceiptText}
      title={t(`${key}.title`)}
      subtitle={t(`${key}.subtitle`)}
      columns={['date', 'amountPaid', 'method', 'referenceCode'].map((column) => t(`${key}.${column}`))}
      rows={statement?.payments ?? []}
      renderRow={(payment, index) => (
        <tr key={`${payment.paidAt}-${index}`}>
          <td className={cell}>{formatDay(payment.paidAt)}</td>
          <td className={cell}>{formatMoney(payment.amountRwf)}</td>
          <td className={cell}>{t(`payments.methods.${payment.method}`, { defaultValue: payment.method })}</td>
          <td className={`${cell} font-mono text-xs`}>{payment.reference}</td>
        </tr>
      )}
      emptyMessage={statementMessage(t, statement, error, t(`${key}.empty`))}
    />
  )
}

// onChanged runs after a delivery was reversed or corrected, so the page can reload the statement.
export function StatementSections({ memberId, statement, statementError, onChanged }) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <DeliveriesSection memberId={memberId} onChanged={onChanged} />
        <LotSharesSection statement={statement} error={statementError} />
      </div>
      <SaleCreditsSection statement={statement} error={statementError} />
      <PaymentsSection statement={statement} error={statementError} />
    </>
  )
}
