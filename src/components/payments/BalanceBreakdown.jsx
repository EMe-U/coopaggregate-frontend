import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, X } from 'lucide-react'
import { getMemberStatement } from '../../api/members'
import { listPayments } from '../../api/payments'
import ReversedBadge from '../ReversedBadge'
import { formatDay, formatKg, formatMoney } from '../../utils/format'

const NO_VALUE = '—'

// Every payment of the member, reversed ones included (the statement lists only the others).
async function listAllPayments(memberId) {
  const payments = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listPayments({ memberId, page, size: 100 })
    payments.push(...data.content)
    totalPages = data.totalPages
    page++
  }
  return payments
}

const sum = (lines, field) => lines.reduce((total, line) => total + (line[field] ?? 0), 0)

// The lines behind the row's amounts. Each sale by grade gives one line per batch it paid. Lots
// shared before sales by grade have no deduction of their own in the statement, so they make one
// line whose deduction is the rest of the total: the columns then add up to the row exactly.
function breakdownOf(statement) {
  const sales = statement.saleCredits
  const olderLots = statement.lotShares.filter((share) => share.status === 'SHARED' && share.shareRwf != null)
  const olderGross = statement.grossShareRwf - sum(sales, 'grossRwf')
  const olderDeduction = statement.deductionsRwf - sum(sales, 'deductionRwf')
  const older =
    olderGross !== 0 || olderDeduction !== 0
      ? { lots: olderLots.map((share) => share.lotCode), grossRwf: olderGross, deductionRwf: olderDeduction }
      : null
  return { sales, older }
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  )
}

const minus = (amount) => (amount ? `−${formatMoney(amount)}` : formatMoney(0))

function SalesLines({ sales, older, statement }) {
  const { t } = useTranslation()
  const key = 'payments.breakdown'
  const cell = 'whitespace-nowrap px-2 py-2'
  const number = `${cell} text-right`
  const columns = ['date', 'lot', 'buyer', 'kg', 'pricePerKg', 'amount', 'deduction', 'net']
  const olderLabel = older && t(`${key}.olderShares`, { lots: older.lots.join(', ') || NO_VALUE })
  const netTotal = statement.grossShareRwf - statement.deductionsRwf

  if (sales.length === 0 && !older) return <p className="text-sm text-muted">{t(`${key}.noSales`)}</p>

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm" data-testid="breakdown-sales">
          <thead className="bg-background text-xs text-muted">
            <tr>
              {columns.map((column, index) => (
                <th key={column} className={`whitespace-nowrap px-2 py-2 font-semibold ${index >= 3 ? 'text-right' : ''}`}>
                  {t(`${key}.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {sales.map((line, index) => (
              <tr key={`${line.saleCode}-${line.receiptCode}-${line.lotCode}-${index}`}>
                <td className={cell}>{formatDay(line.soldAt)}</td>
                <td className={`${cell} font-mono text-xs`}>{line.lotCode ?? NO_VALUE}</td>
                <td className={cell}>{line.buyerName || NO_VALUE}</td>
                <td className={number}>{formatKg(line.kg)}</td>
                <td className={number}>{formatMoney(line.pricePerKg)}</td>
                <td className={number}>{formatMoney(line.grossRwf)}</td>
                <td className={`${number} text-muted`}>{minus(line.deductionRwf)}</td>
                <td className={`${number} font-medium`}>{formatMoney(line.netRwf)}</td>
              </tr>
            ))}
            {older && (
              <tr>
                <td className="px-2 py-2" colSpan={5}>
                  {olderLabel}
                </td>
                <td className={number}>{formatMoney(older.grossRwf)}</td>
                <td className={`${number} text-muted`}>{minus(older.deductionRwf)}</td>
                <td className={`${number} font-medium`}>{formatMoney(older.grossRwf - older.deductionRwf)}</td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-text/10 font-semibold">
            <tr>
              <td className="px-2 py-2" colSpan={5}>
                {t(`${key}.total`)}
              </td>
              <td className={number} data-testid="total-gross">{formatMoney(statement.grossShareRwf)}</td>
              <td className={`${number} text-muted`} data-testid="total-deduction">{minus(statement.deductionsRwf)}</td>
              <td className={number} data-testid="total-net">{formatMoney(netTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="divide-y divide-text/5 rounded-lg bg-background/60 md:hidden">
        {sales.map((line, index) => (
          <li key={`${line.saleCode}-${line.receiptCode}-${line.lotCode}-${index}`} className="space-y-0.5 p-3 text-sm">
            <p className="flex flex-wrap justify-between gap-x-3">
              <span>{formatDay(line.soldAt)}</span>
              <span className="font-semibold">{formatMoney(line.netRwf)}</span>
            </p>
            <p className="text-xs text-muted">
              <span className="font-mono">{line.lotCode ?? NO_VALUE}</span> · {line.buyerName || NO_VALUE}
            </p>
            <p className="text-xs text-muted">
              {t(`${key}.card`, {
                kg: formatKg(line.kg),
                price: formatMoney(line.pricePerKg),
                amount: formatMoney(line.grossRwf),
                deduction: formatMoney(line.deductionRwf),
              })}
            </p>
          </li>
        ))}
        {older && (
          <li className="space-y-0.5 p-3 text-sm">
            <p className="flex flex-wrap justify-between gap-x-3">
              <span>{olderLabel}</span>
              <span className="font-semibold">{formatMoney(older.grossRwf - older.deductionRwf)}</span>
            </p>
            <p className="text-xs text-muted">
              {formatMoney(older.grossRwf)} {minus(older.deductionRwf)}
            </p>
          </li>
        )}
        <li className="flex flex-wrap justify-between gap-x-3 p-3 text-sm font-semibold">
          <span>{t(`${key}.total`)}</span>
          <span>{formatMoney(netTotal)}</span>
        </li>
      </ul>
    </>
  )
}

function PaymentLines({ payments, paidRwf }) {
  const { t } = useTranslation()
  const key = 'payments.breakdown'
  if (payments.length === 0) return <p className="text-sm text-muted">{t(`${key}.noPayments`)}</p>

  return (
    <ul className="divide-y divide-text/5 rounded-lg bg-background/60" data-testid="breakdown-payments">
      {payments.map((payment) => (
        <li key={payment.id} className={`p-3 text-sm ${payment.reversed ? 'opacity-70' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p>
                <span className={`font-mono text-xs font-medium ${payment.reversed ? 'line-through' : ''}`}>
                  {payment.paymentCode}
                </span>
                <span className="text-muted"> · {formatDay(payment.paidAt)}</span>
              </p>
              <p className="wrap-break-word text-xs text-muted">
                {t(`payments.methods.${payment.method}`, { defaultValue: payment.method })}
                {payment.reference && <> · <span className="font-mono">{payment.reference}</span></>}
              </p>
            </div>
            <span className={`font-semibold ${payment.reversed ? 'line-through' : ''}`}>{formatMoney(payment.amountRwf)}</span>
          </div>
          {payment.reversed && (
            <p className="mt-1 text-xs text-muted">
              <ReversedBadge reason={payment.reversalReason} />
              {/* Not counted in the total paid. The reason is written out: a phone has no hover. */}
              {payment.reversalReason && (
                <span className="ml-1.5 wrap-break-word">{t('reversal.reasonTooltip', { reason: payment.reversalReason })}</span>
              )}
            </p>
          )}
        </li>
      ))}
      <li className="flex flex-wrap justify-between gap-x-3 p-3 text-sm font-semibold">
        <span>{t(`${key}.totalPaid`)}</span>
        <span data-testid="total-paid">{formatMoney(paidRwf)}</span>
      </li>
    </ul>
  )
}

// What a row of the balances table is made of: one line per sale, the payments made (reversed ones
// marked, not counted), then the balance. member is the row; onPay opens the payment form for it.
export default function BalanceBreakdown({ member, onClose, onPay }) {
  const { t } = useTranslation()
  const key = 'payments.breakdown'
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    Promise.all([getMemberStatement(member.memberId), listAllPayments(member.memberId)])
      .then(([statement, payments]) => {
        if (!ignore) setData({ statement, payments })
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [member.memberId, retryKey])

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') onClose()
    },
    [onClose],
  )
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function renderBody() {
    if (loadError) {
      return (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-danger">{t(`${key}.error`)}</p>
          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
          >
            {t('payments.balances.retry')}
          </button>
        </div>
      )
    }
    if (!data) {
      return (
        <div className="space-y-2" aria-busy="true">
          <p className="sr-only">{t(`${key}.loading`)}</p>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )
    }

    const { statement, payments } = data
    const { sales, older } = breakdownOf(statement)
    const net = statement.grossShareRwf - statement.deductionsRwf
    // The list and the breakdown are loaded at different times; a sale or payment in between makes
    // them differ, and the manager should know which one is current.
    const changed =
      statement.grossShareRwf !== member.shareRwf ||
      statement.deductionsRwf !== member.deductionRwf ||
      statement.paidRwf !== member.paidRwf ||
      statement.owedRwf !== member.balanceRwf

    return (
      <div className="space-y-6">
        {changed && (
          <p role="status" className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-amber-800">
            {t(`${key}.changed`)}
          </p>
        )}
        <Section title={t(`${key}.salesTitle`)}>
          <SalesLines sales={sales} older={older} statement={statement} />
        </Section>
        <Section title={t(`${key}.paymentsTitle`)}>
          <PaymentLines payments={payments} paidRwf={statement.paidRwf} />
        </Section>
        <Section title={t(`${key}.balanceTitle`)}>
          <dl className="space-y-1 rounded-lg bg-primary-light/50 p-3 text-sm" data-testid="breakdown-balance">
            <div className="flex justify-between gap-3">
              <dt>{t(`${key}.earnedNet`)}</dt>
              <dd>{formatMoney(net)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t(`${key}.paid`)}</dt>
              <dd>{minus(statement.paidRwf)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-primary/15 pt-1 text-base font-semibold">
              <dt>{t(`${key}.balance`)}</dt>
              <dd data-testid="balance">{formatMoney(statement.owedRwf)}</dd>
            </div>
          </dl>
        </Section>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="balance-breakdown-title"
        className="w-full max-w-4xl rounded-xl bg-surface shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-text/5 px-5 py-4">
          <div className="min-w-0">
            <h2 id="balance-breakdown-title" className="flex items-center gap-2 text-lg font-semibold text-text">
              <Wallet size={18} className="shrink-0 text-primary" />
              <span className="min-w-0 wrap-break-word">{t(`${key}.title`, { name: member.memberName })}</span>
            </h2>
            <p className="font-mono text-xs text-muted">{member.memberNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted hover:bg-background hover:text-text"
            aria-label={t('payments.form.close')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{renderBody()}</div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-text/5 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
          >
            {t('payments.form.close')}
          </button>
          {member.balanceRwf > 0 && (
            <button
              type="button"
              onClick={() => onPay(member)}
              className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {t('payments.form.title')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
