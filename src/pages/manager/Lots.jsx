import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes } from 'lucide-react'
import { getStock } from '../../api/lots'
import PageTitle from '../../components/PageTitle'
import SuccessToast from '../../components/SuccessToast'
import LossModal from '../../components/lots/LossModal'
import LotsTable from '../../components/lots/LotsTable'
import StockOverview from '../../components/lots/StockOverview'

export default function Lots() {
  const { t } = useTranslation()

  const [stock, setStock] = useState(null)
  const [stockError, setStockError] = useState(false)
  // Bumped after a loss so the table shows the new numbers.
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  const [lossLot, setLossLot] = useState(null)

  const loadStock = useCallback(() => {
    setStockError(false)
    getStock()
      .then(setStock)
      .catch(() => setStockError(true))
  }, [])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  function refresh() {
    setReloadKey((key) => key + 1)
    loadStock()
  }

  function handleLossSaved() {
    setLossLot(null)
    setNotice(t('lots.loss.saved'))
    refresh()
  }

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

      <LotsTable reloadKey={reloadKey} onRecordLoss={setLossLot} />

      {lossLot && <LossModal lot={lossLot} onClose={() => setLossLot(null)} onSaved={handleLossSaved} />}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
