import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'
import PageTitle from '../../components/PageTitle'
import BuyerPaymentSplit from '../../components/payments/BuyerPaymentSplit'
import BuyerPaymentsTable from '../../components/payments/BuyerPaymentsTable'

// Money in: what buyers paid, one payment per order, and how each one was split between the farmers.
// Paying the farmers is on the Disburse page.
export default function Payments() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(null)

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-surface p-5 shadow-sm sm:p-6">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
          <Wallet size={14} />
          {t('buyerPayments.eyebrow')}
        </p>
        <PageTitle className="mb-1">{t('buyerPayments.pageTitle')}</PageTitle>
        <p className="max-w-2xl text-sm text-muted">{t('buyerPayments.subtitle')}</p>
      </div>

      <BuyerPaymentsTable onOpen={setOpen} />

      {open && <BuyerPaymentSplit payment={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
