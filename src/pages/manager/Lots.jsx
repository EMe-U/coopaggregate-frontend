import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes } from 'lucide-react'
import { getStock } from '../../api/lots'
import PageTitle from '../../components/PageTitle'
import StockOverview from '../../components/lots/StockOverview'

export default function Lots() {
  const { t } = useTranslation()

  const [stock, setStock] = useState(null)
  const [stockError, setStockError] = useState(false)

  const loadStock = useCallback(() => {
    setStockError(false)
    getStock()
      .then(setStock)
      .catch(() => setStockError(true))
  }, [])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
          <Boxes size={14} />
          {t('lots.eyebrow')}
        </p>
        <PageTitle className="mb-0">{t('lots.title')}</PageTitle>
      </div>

      <StockOverview stock={stock} error={stockError} onRetry={loadStock} />
    </div>
  )
}
