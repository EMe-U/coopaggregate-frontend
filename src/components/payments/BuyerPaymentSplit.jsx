import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ReceiptText, X } from 'lucide-react'
import { getSale } from '../../api/sales'
import useGradeName from '../../hooks/useGradeName'
import { formatDay, formatKg, formatMoney } from '../../utils/format'
import { MethodBadge } from './BuyerPaymentsTable'

const NO_VALUE = '—'
const minus = (amount) => (amount ? `−${formatMoney(amount)}` : formatMoney(0))

// The lots a sale took its kg from: the batches' lots, or the lot of a sale from before sales by grade.
function lotsOf(sale) {
  if (sale.lotCode) return [sale.lotCode]
  return [...new Set((sale.batches ?? []).map((batch) => batch.lotCode).filter(Boolean))]
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  )
}

// The sales of the order, one per grade, with the lots they used (loaded one sale at a time).
function SaleLines({ sales }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const [lots, setLots] = useState({})

  useEffect(() => {
    let ignore = false
    for (const sale of sales) {
      getSale(sale.saleId)
        .then((data) => {
          if (!ignore) setLots((current) => ({ ...current, [sale.saleId]: lotsOf(data) }))
        })
        .catch(() => {
          if (!ignore) setLots((current) => ({ ...current, [sale.saleId]: null }))
        })
    }
    return () => {
      ignore = true
    }
  }, [sales])

  return (
    <ul className="divide-y divide-text/5 rounded-lg bg-background/60" data-testid="split-sales">
      {sales.map((sale) => {
        const saleLots = lots[sale.saleId]
        return (
          <li key={sale.saleId} className="space-y-0.5 p-3 text-sm">
            <p className="flex flex-wrap justify-between gap-x-3">
              <span>
                <span className="font-mono text-xs font-medium">{sale.saleCode}</span> · {gradeName(sale.gradeName)}
              </span>
              <span className="font-semibold">{formatMoney(sale.amountRwf)}</span>
            </p>
            <p className="text-xs text-muted">
              {t('buyerPayments.split.saleLine', { kg: formatKg(sale.kg), price: formatMoney(sale.pricePerKg) })}
            </p>
            <p className="text-xs text-muted">
              {t('buyerPayments.split.lots')}{' '}
              {saleLots === undefined ? '…' : saleLots?.length ? <span className="font-mono">{saleLots.join(', ')}</span> : NO_VALUE}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

// One line per farmer with kg, gross, deduction and net; the totals are the order's. A farmer paid
// through the lot share of a sale from before sales by grade has kg but no money of their own.
function FarmerLines({ payment }) {
  const { t } = useTranslation()
  const key = 'buyerPayments.split'
  const cell = 'whitespace-nowrap px-2 py-2'
  const number = `${cell} text-right`
  const lotShare = <span className="text-xs italic text-muted">{t(`${key}.lotShare`)}</span>

  if (payment.farmers.length === 0) return <p className="text-sm text-muted">{t(`${key}.noFarmers`)}</p>

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm" data-testid="split-farmers">
          <thead className="bg-background text-xs text-muted">
            <tr>
              {['farmer', 'kg', 'gross', 'deduction', 'net'].map((column, index) => (
                <th key={column} className={`whitespace-nowrap px-2 py-2 font-semibold ${index > 0 ? 'text-right' : ''}`}>
                  {t(`${key}.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {payment.farmers.map((farmer) => (
              <tr key={farmer.memberId}>
                <td className="px-2 py-2">
                  <Link to={`/members/${farmer.memberId}`} className="font-medium text-primary hover:underline">
                    {farmer.memberName}
                  </Link>
                  <span className="ml-1.5 font-mono text-xs text-muted">{farmer.memberNumber}</span>
                </td>
                <td className={number}>{formatKg(farmer.kg)}</td>
                {farmer.grossRwf == null ? (
                  <td className={number} colSpan={3}>
                    {lotShare}
                  </td>
                ) : (
                  <>
                    <td className={number}>{formatMoney(farmer.grossRwf)}</td>
                    <td className={`${number} text-muted`}>{minus(farmer.deductionRwf)}</td>
                    <td className={`${number} font-medium`}>{formatMoney(farmer.netRwf)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-text/10 font-semibold">
            <tr>
              <td className="px-2 py-2">{t(`${key}.total`)}</td>
              <td className={number} data-testid="split-total-kg">{formatKg(payment.totalKg)}</td>
              <td className={number} data-testid="split-total-gross">{formatMoney(payment.totalAmountRwf)}</td>
              <td className={`${number} text-muted`} data-testid="split-total-deduction">
                {payment.totalDeductionRwf == null ? NO_VALUE : minus(payment.totalDeductionRwf)}
              </td>
              <td className={number} data-testid="split-total-net">
                {payment.totalNetRwf == null ? NO_VALUE : formatMoney(payment.totalNetRwf)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="divide-y divide-text/5 rounded-lg bg-background/60 md:hidden" data-testid="split-farmers-cards">
        {payment.farmers.map((farmer) => (
          <li key={farmer.memberId} className="space-y-0.5 p-3 text-sm">
            <p className="flex flex-wrap justify-between gap-x-3">
              <Link to={`/members/${farmer.memberId}`} className="font-medium text-primary hover:underline">
                {farmer.memberName}
              </Link>
              <span className="font-semibold">{farmer.netRwf == null ? '' : formatMoney(farmer.netRwf)}</span>
            </p>
            <p className="font-mono text-xs text-muted">{farmer.memberNumber}</p>
            <p className="text-xs text-muted">
              {farmer.grossRwf == null
                ? <>{formatKg(farmer.kg)} · {lotShare}</>
                : t(`${key}.card`, {
                    kg: formatKg(farmer.kg),
                    gross: formatMoney(farmer.grossRwf),
                    deduction: formatMoney(farmer.deductionRwf),
                  })}
            </p>
          </li>
        ))}
        <li className="space-y-0.5 p-3 text-sm font-semibold">
          <p className="flex flex-wrap justify-between gap-x-3">
            <span>{t(`${key}.total`)}</span>
            <span>{payment.totalNetRwf == null ? formatMoney(payment.totalAmountRwf) : formatMoney(payment.totalNetRwf)}</span>
          </p>
          <p className="text-xs font-normal text-muted">
            {payment.totalNetRwf == null
              ? formatKg(payment.totalKg)
              : t(`${key}.card`, {
                  kg: formatKg(payment.totalKg),
                  gross: formatMoney(payment.totalAmountRwf),
                  deduction: formatMoney(payment.totalDeductionRwf),
                })}
          </p>
        </li>
      </ul>
    </>
  )
}

// What one buyer payment (an order) was split into: the sales of each grade, then each farmer's part.
export default function BuyerPaymentSplit({ payment, onClose }) {
  const { t } = useTranslation()
  const key = 'buyerPayments.split'

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="buyer-payment-split-title" className="w-full max-w-3xl rounded-xl bg-surface shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-text/5 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <h2 id="buyer-payment-split-title" className="flex items-center gap-2 text-lg font-semibold text-text">
              <ReceiptText size={18} className="shrink-0 text-primary" />
              <span className="min-w-0 wrap-break-word">{t(`${key}.title`, { code: payment.orderCode })}</span>
            </h2>
            <p className="text-sm text-muted">
              {payment.buyerName} · {formatDay(payment.paidAt)} · {formatMoney(payment.totalAmountRwf)}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs">
              <MethodBadge method={payment.method} />
              {payment.reference && <span className="break-all font-mono text-muted">{payment.reference}</span>}
            </p>
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
        <div className="space-y-6 px-5 py-4">
          <Section title={t(`${key}.salesTitle`)}>
            <SaleLines sales={payment.sales} />
          </Section>
          <Section title={t(`${key}.farmersTitle`)}>
            <FarmerLines payment={payment} />
          </Section>
        </div>
        <div className="flex justify-end border-t border-text/5 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
          >
            {t('payments.form.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
