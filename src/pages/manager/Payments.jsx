import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'
import OwedMembers from '../../components/payments/OwedMembers'
import TotalOwedCard from '../../components/payments/TotalOwedCard'

export default function Payments() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <PageTitle className="mb-1">{t('payments.title')}</PageTitle>
        <p className="text-sm text-muted">{t('payments.subtitle')}</p>
      </div>
      <TotalOwedCard />
      <OwedMembers />
    </div>
  )
}
