import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'
import SaleForm from '../../components/sales/SaleForm'
import SalesSummaryCards from '../../components/sales/SalesSummaryCards'

export default function Sales() {
  const { t } = useTranslation()
  // Set when coming from a lot's "Record sale" button.
  const [searchParams] = useSearchParams()

  return (
    <div className="space-y-6">
      <PageTitle className="mb-0">{t('sales.title')}</PageTitle>
      <SalesSummaryCards />
      <SaleForm initialLotId={searchParams.get('lotId')} />
    </div>
  )
}
