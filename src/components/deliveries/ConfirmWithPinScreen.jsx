import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, HandHeart } from 'lucide-react'
import { confirmDelivery } from '../../api/deliveries'
import { formatDateTime, formatKg } from '../../utils/format'
import FullScreen from '../pin/FullScreen'
import PinKeypad from '../pin/PinKeypad'

const bigButton =
  'flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-lg font-semibold text-white hover:bg-primary/90 disabled:opacity-60'

// Confirms a delivery that is waiting: the member checks it and types their PIN. A wrong PIN shows
// the server's message with the attempts left; the PIN is cleared after every try.
export default function ConfirmWithPinScreen({ delivery, onClose, onConfirmed }) {
  const { t } = useTranslation()
  const [step, setStep] = useState('handover')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handlePin(complete) {
    setPin('')
    setSaving(true)
    setError('')
    try {
      await confirmDelivery(delivery.id, complete)
      setStep('done')
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('confirmation.confirmError'))
      setLocked(requestError.response?.status === 409)
    } finally {
      setSaving(false)
    }
  }

  return (
    <FullScreen
      label={t('pin.handTo', { name: delivery.memberName })}
      onClose={saving ? undefined : step === 'done' ? onConfirmed : onClose}
    >
      {step === 'handover' && (
        <>
          <HandHeart size={48} className="mx-auto text-primary" />
          <h1 className="mt-3 text-2xl font-semibold text-text">{t('pin.handTo', { name: delivery.memberName })}</h1>
          <dl className="mt-6 divide-y divide-text/10 rounded-2xl bg-background px-5 text-left text-lg">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{t('confirmation.quantity')}</dt>
              <dd className="font-semibold">{formatKg(delivery.quantityKg)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{t('confirmation.grade')}</dt>
              <dd className="font-semibold">{t(`grades.${delivery.gradeName}`, { defaultValue: delivery.gradeName })}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{t('confirmation.date')}</dt>
              <dd className="font-semibold">{formatDateTime(delivery.deliveredAt)}</dd>
            </div>
          </dl>
          <button type="button" onClick={() => setStep('pin')} className={`${bigButton} mt-8`}>
            {t('confirmation.correct')}
          </button>
        </>
      )}

      {step === 'pin' && (
        <>
          <h1 className="text-2xl font-semibold text-text">{t('confirmation.pinTitle')}</h1>
          <p className="mt-2 mb-6 text-muted">{t('pin.coverHint')}</p>
          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-danger">
              {error}
            </p>
          )}
          {!locked && <PinKeypad value={pin} onChange={setPin} onComplete={handlePin} disabled={saving} />}
          {saving && <p className="mt-4 text-muted">{t('confirmation.saving')}</p>}
        </>
      )}

      {step === 'done' && (
        <>
          <CircleCheck size={64} className="mx-auto text-primary" />
          <h1 className="mt-4 text-2xl font-semibold text-text">{t('confirmation.confirmed')}</h1>
          <p className="mt-2 text-muted">{t('pin.set.handBack')}</p>
          <button type="button" onClick={onConfirmed} className={`${bigButton} mt-8`}>
            {t('pin.set.finish')}
          </button>
        </>
      )}
    </FullScreen>
  )
}
