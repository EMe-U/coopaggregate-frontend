import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'
import { getBalances } from '../../api/payments'
import PageTitle from '../../components/PageTitle'
import SuccessToast from '../../components/SuccessToast'
import BalancesTable from '../../components/payments/BalancesTable'
import PaymentHistory from '../../components/payments/PaymentHistory'
import RecordPaymentPanel from '../../components/payments/RecordPaymentPanel'
import { formatMoney } from '../../utils/format'

function HeaderStat({ label, value, dark }) {
  return (
    <div className={`min-w-36 rounded-lg p-4 ${dark ? 'bg-primary text-white' : 'bg-background'}`}>
      <p className={`text-xs ${dark ? 'text-white/70' : 'text-muted'}`}>{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

export default function Payments() {
  const { t } = useTranslation()
  const panelRef = useRef(null)

  // Loaded without filters: the header totals and the panel's member list cover everyone.
  const [balances, setBalances] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  // Bumped after a payment so the totals, the balances table and the history reload.
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

  const membersToPay = balances?.members.filter((member) => member.balanceRwf > 0)
  const noValue = t('members.statement.noValue')

  function handlePay(member) {
    setSelectedId(member.memberId)
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleReversed(payment) {
    setNotice(t('reversal.payment.done', { code: payment.paymentCode }))
    setReloadKey((key) => key + 1)
  }

  function handleSaved() {
    setSelectedId(null)
    setNotice(t('payments.form.saved'))
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
        <div className="min-w-0 max-w-xl">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Wallet size={14} />
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <BalancesTable reloadKey={reloadKey} selectedId={selectedId} onPay={handlePay} />
        </div>
        <RecordPaymentPanel
          ref={panelRef}
          members={membersToPay}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSaved={handleSaved}
          formKey={reloadKey}
        />
      </div>

      <PaymentHistory reloadKey={reloadKey} onChanged={handleReversed} />

      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
