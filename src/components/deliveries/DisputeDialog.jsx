import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { disputeDelivery } from '../../api/deliveries'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatKg } from '../../utils/format'

const REASONS = ['WRONG_KG', 'WRONG_GRADE', 'NOT_MY_DELIVERY', 'OTHER']

// Records that the member says the delivery is wrong. The manager then corrects or reverses it, or
// marks it as checked when the record was right.
export default function DisputeDialog({ delivery, onClose, onDisputed }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, onClose])

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    if (!reason) {
      setError(t('confirmation.dispute.reasonRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await disputeDelivery(delivery.id, { reason, note: note.trim() || null })
      onDisputed()
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('confirmation.dispute.error'))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-title"
        className="my-auto w-full max-w-md rounded-xl bg-surface p-5 text-left shadow-lg"
      >
        <h2 id="dispute-title" className="text-lg font-semibold text-text">
          {t('confirmation.dispute.title', { code: delivery.receiptCode })}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {delivery.memberName} · {formatKg(delivery.quantityKg)}
        </p>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-text">{t('confirmation.dispute.reason')}</legend>
          <div className="grid gap-2">
            {REASONS.map((value) => (
              <label
                key={value}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm ${
                  reason === value ? 'border-danger bg-danger/5 text-text' : 'border-text/10 text-text hover:bg-background'
                }`}
              >
                <input
                  type="radio"
                  name="dispute-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => {
                    setReason(value)
                    setError('')
                  }}
                  disabled={saving}
                  className="h-4 w-4 accent-danger"
                />
                {t(`confirmation.disputeReason.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="dispute-note" className="mt-4 mb-1.5 block text-sm font-medium text-text">
          {t('confirmation.dispute.note')}
        </label>
        <textarea
          id="dispute-note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('confirmation.dispute.notePlaceholder')}
          disabled={saving}
          className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-12 flex-1 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
          >
            {t('reversal.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || needsInternet.offline}
            title={needsInternet.title}
            className="min-h-12 flex-1 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t('reversal.reversing') : t('confirmation.dispute.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
