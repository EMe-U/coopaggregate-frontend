import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'
import SuccessToast from '../../components/SuccessToast'
import OwedMembers from '../../components/payments/OwedMembers'
import PaymentFormModal from '../../components/payments/PaymentFormModal'
import TotalOwedCard from '../../components/payments/TotalOwedCard'

export default function Payments() {
  const { t } = useTranslation()

  const [paying, setPaying] = useState(null)
  // Bumped after a payment so the total, the owed list and the history reload.
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  function handleSaved() {
    setPaying(null)
    setNotice(t('payments.form.saved'))
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <PageTitle className="mb-1">{t('payments.title')}</PageTitle>
        <p className="text-sm text-muted">{t('payments.subtitle')}</p>
      </div>
      <TotalOwedCard reloadKey={reloadKey} />
      <OwedMembers reloadKey={reloadKey} onPay={setPaying} />

      {paying && <PaymentFormModal member={paying} onClose={() => setPaying(null)} onSaved={handleSaved} />}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
