import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HandCoins } from 'lucide-react'
import { getBalances } from '../../api/payments'
import PageTitle from '../../components/PageTitle'
import SuccessToast from '../../components/SuccessToast'
import BalanceBreakdown from '../../components/payments/BalanceBreakdown'
import BalancesTable from '../../components/payments/BalancesTable'
import PaymentFormModal from '../../components/payments/PaymentFormModal'
import PaymentHistory from '../../components/payments/PaymentHistory'
import { formatMoney } from '../../utils/format'

function HeaderStat({ label, value, dark }) {
  return (
    <div className={`min-w-36 rounded-lg p-4 ${dark ? 'bg-primary text-white' : 'bg-background'}`}>
      <p className={`text-xs ${dark ? 'text-white/70' : 'text-muted'}`}>{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

// Money out to farmers: what each one is owed, the Disburse dialog (always the whole balance), and the
// disbursements made, which can be reversed.
export default function Disburse() {
  const { t } = useTranslation()

  // Loaded without filters: the header totals cover everyone, and the dialog reads the current balance
  // from here, so a reload after a refusal shows the new amount.
  const [balances, setBalances] = useState(null)
  const [breakdownOf, setBreakdownOf] = useState(null)
  const [disbursingId, setDisbursingId] = useState(null)
  // Bumped after a disbursement, a reversal or a refusal so the totals, the table and the history reload.
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  useEffect(() => {
    let ignore = false
    getBalances()
      .then((data) => {
        if (!ignore) setBalances(data)
      })
      // The table below shows its own error; the header just keeps no values.
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [reloadKey])

  const noValue = t('members.statement.noValue')
  const reload = () => setReloadKey((key) => key + 1)
  // The row that was clicked until the totals are loaded, then the current figures.
  const [disbursingRow, setDisbursingRow] = useState(null)
  const disbursing = disbursingId && (balances?.members.find((member) => member.memberId === disbursingId) ?? disbursingRow)

  function handlePay(member) {
    setBreakdownOf(null)
    setDisbursingRow(member)
    setDisbursingId(member.memberId)
  }

  function closeDialog() {
    setDisbursingId(null)
    setDisbursingRow(null)
  }

  function handleSaved() {
    closeDialog()
    setNotice(t('payments.form.saved'))
    reload()
  }

  function handleReversed(payment) {
    setNotice(t('reversal.payment.done', { code: payment.paymentCode }))
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
        <div className="min-w-0 max-w-xl">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <HandCoins size={14} />
            {t('payments.eyebrow')}
          </p>
          <PageTitle className="mb-1">{t('payments.title')}</PageTitle>
          <p className="text-sm text-muted">{t('payments.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <HeaderStat label={t('payments.totalOwed')} value={balances ? formatMoney(balances.totalOwedRwf) : noValue} />
          <HeaderStat
            label={t('payments.paidThisWeek')}
            value={balances ? formatMoney(balances.paidThisWeekRwf) : noValue}
            dark
          />
        </div>
      </div>

      <BalancesTable reloadKey={reloadKey} onOpen={setBreakdownOf} onPay={handlePay} />

      <PaymentHistory reloadKey={reloadKey} onChanged={handleReversed} />

      {breakdownOf && (
        <BalanceBreakdown member={breakdownOf} onClose={() => setBreakdownOf(null)} onPay={handlePay} />
      )}
      {disbursing && (
        <PaymentFormModal
          member={{
            memberId: disbursing.memberId,
            memberName: disbursing.memberName,
            memberNumber: disbursing.memberNumber,
            owedRwf: disbursing.balanceRwf,
          }}
          onClose={closeDialog}
          onSaved={handleSaved}
          onRefused={reload}
        />
      )}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
