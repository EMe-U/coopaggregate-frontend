import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes } from 'lucide-react'
import { closeLot, getStock } from '../../api/lots'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageTitle from '../../components/PageTitle'
import SuccessToast from '../../components/SuccessToast'
import LossModal from '../../components/lots/LossModal'
import LotsTable from '../../components/lots/LotsTable'
import StockOverview from '../../components/lots/StockOverview'
import useNeedsInternet from '../../hooks/useNeedsInternet'

export default function Lots() {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()

  const [stock, setStock] = useState(null)
  const [stockError, setStockError] = useState(false)
  // Bumped after a loss or a close so the table shows the new numbers.
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  const [closing, setClosing] = useState(null)
  const [lossLot, setLossLot] = useState(null)
  const [closeBusy, setCloseBusy] = useState(false)
  const [closeError, setCloseError] = useState('')

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

  function askToClose(lot) {
    setCloseError('')
    setClosing(lot)
  }

  async function confirmClose() {
    setCloseBusy(true)
    setCloseError('')
    try {
      await closeLot(closing.id)
      setNotice(t('lots.close.done', { code: closing.code }))
      setClosing(null)
      refresh()
    } catch (error) {
      setCloseError(error.response?.data?.message || t('lots.detail.closeError'))
    } finally {
      setCloseBusy(false)
    }
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

      <LotsTable reloadKey={reloadKey} onClose={askToClose} onRecordLoss={setLossLot} />

      {closing && (
        <ConfirmDialog
          title={t('lots.close.title', { code: closing.code })}
          message={t('lots.close.message', {
            grade: t(`grades.${closing.gradeName}`, { defaultValue: closing.gradeName }),
          })}
          confirmLabel={closeBusy ? t('lots.detail.closing') : t('lots.close.confirm')}
          cancelLabel={t('lots.close.cancel')}
          busy={closeBusy}
          error={closeError}
          onConfirm={confirmClose}
          confirmDisabled={needsInternet.offline}
          confirmTitle={needsInternet.title}
          onCancel={() => setClosing(null)}
        />
      )}
      {lossLot && <LossModal lot={lossLot} onClose={() => setLossLot(null)} onSaved={handleLossSaved} />}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
