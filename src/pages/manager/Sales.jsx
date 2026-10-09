import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'
import SaleForm from '../../components/sales/SaleForm'
import SalesHistory from '../../components/sales/SalesHistory'
import SalesSummaryCards from '../../components/sales/SalesSummaryCards'

export default function Sales() {
  const { t } = useTranslation()
  // Set when coming from a lot's "Record sale" button.
  const [searchParams] = useSearchParams()
  const [historyReloadKey, setHistoryReloadKey] = useState(0)

  return (
    <div className="space-y-6">
      <PageTitle className="mb-0">{t('sales.title')}</PageTitle>
      <SalesSummaryCards />
      <SaleForm
        initialLotId={searchParams.get('lotId')}
        onSaved={() => setHistoryReloadKey((key) => key + 1)}
      />
      <SalesHistory reloadKey={historyReloadKey} />
    </div>
  )
}
