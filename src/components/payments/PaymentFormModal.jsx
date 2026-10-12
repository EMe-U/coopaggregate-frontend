import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import PaymentForm from './PaymentForm'

// member: { memberId, memberName, owedRwf }
export default function PaymentFormModal({ member, onClose, onSaved }) {
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
        aria-labelledby="payment-form-title"
        className="w-full max-w-md rounded-xl bg-surface shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-text/5 px-5 py-4">
          <div className="min-w-0">
            <h2 id="payment-form-title" className="text-lg font-semibold text-text">
              {t('payments.form.modalTitle', { name: member.memberName })}
            </h2>
            <p className="text-sm text-muted">{t('payments.form.owed', { amount: formatMoney(member.owedRwf) })}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted hover:bg-background hover:text-text"
            aria-label={t('payments.form.close')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">
          <PaymentForm member={member} onSaved={onSaved} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}
