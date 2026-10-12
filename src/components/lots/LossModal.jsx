import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import LossForm from './LossForm'

export default function LossModal({ lot, onClose, onSaved }) {
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loss-modal-title"
        className="w-full max-w-md rounded-xl bg-surface shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-text/5 px-5 py-4">
          <div className="min-w-0">
            <h2 id="loss-modal-title" className="text-lg font-semibold text-text">
              {t('lots.loss.modalTitle', { code: lot.code })}
            </h2>
            <p className="text-sm text-muted">{t('lots.loss.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted hover:bg-background hover:text-text"
            aria-label={t('lots.loss.close')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">
          <LossForm lot={lot} onSaved={onSaved} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}
