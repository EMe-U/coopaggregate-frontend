import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleX, Clock, HandHeart } from 'lucide-react'
import { formatDate, formatKg } from '../../utils/format'
import FullScreen from '../pin/FullScreen'
import PinKeypad from '../pin/PinKeypad'

const choiceClass = 'flex min-h-16 w-full items-center justify-center gap-3 rounded-xl px-6 text-lg font-semibold'

function SummaryRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-xl font-semibold text-text">{children}</dd>
    </div>
  )
}

// Shown before saving: the member checks the delivery on the manager's phone and confirms it with
// their PIN. onSave(pin) saves with the PIN, or without one (pin null). The PIN is only held here
// until it is handed to onSave.
export default function ConfirmDeliveryScreen({ member, grade, quantityKg, date, saving, onSave, onBack }) {
  const { t } = useTranslation()
  const [enteringPin, setEnteringPin] = useState(false)
  const [pin, setPin] = useState('')
  const canUsePin = member.hasPin && !member.pinLocked

  function handlePin(complete) {
    setPin('')
    onSave(complete)
  }

  if (enteringPin) {
    return (
      <FullScreen label={t('confirmation.pinTitle')} onClose={saving ? undefined : () => setEnteringPin(false)}>
        <h1 className="text-2xl font-semibold text-text">{t('confirmation.pinTitle')}</h1>
        <p className="mt-2 mb-8 text-muted">{t('pin.coverHint')}</p>
        <PinKeypad value={pin} onChange={setPin} onComplete={handlePin} disabled={saving} />
        {saving && <p className="mt-4 text-muted">{t('confirmation.saving')}</p>}
      </FullScreen>
    )
  }

  return (
    <FullScreen label={t('pin.handTo', { name: member.fullName })} onClose={saving ? undefined : onBack}>
      <HandHeart size={48} className="mx-auto text-primary" />
      <h1 className="mt-3 text-2xl font-semibold text-text">{t('pin.handTo', { name: member.fullName })}</h1>
      <p className="mt-1 text-muted">{t('confirmation.checkHint')}</p>

      <dl className="mt-6 divide-y divide-text/10 rounded-2xl bg-background px-5 text-left">
        <SummaryRow label={t('confirmation.member')}>{member.fullName}</SummaryRow>
        <SummaryRow label={t('confirmation.quantity')}>{formatKg(quantityKg)}</SummaryRow>
        <SummaryRow label={t('confirmation.grade')}>
          {t(`grades.${grade.name}`, { defaultValue: grade.name })}
        </SummaryRow>
        <SummaryRow label={t('confirmation.date')}>{formatDate(date)}</SummaryRow>
      </dl>

      <div className="mt-8 space-y-3">
        {canUsePin && (
          <>
            <button
              type="button"
              onClick={() => setEnteringPin(true)}
              disabled={saving}
              className={`${choiceClass} bg-primary text-white hover:bg-primary/90 disabled:opacity-60`}
            >
              <CircleCheck size={24} />
              {t('confirmation.correct')}
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className={`${choiceClass} border-2 border-danger/40 text-danger hover:bg-danger/5 disabled:opacity-60`}
            >
              <CircleX size={24} />
              {t('confirmation.notCorrect')}
            </button>
          </>
        )}
        {!canUsePin && (
          <p className="rounded-lg bg-warning/15 px-4 py-3 text-sm text-amber-800">
            {member.pinLocked ? t('confirmation.pinLocked') : t('confirmation.noPin')}
          </p>
        )}
        <button
          type="button"
          onClick={() => onSave(null)}
          disabled={saving}
          className={`${choiceClass} bg-background text-base text-text hover:bg-text/10 disabled:opacity-60`}
        >
          <Clock size={20} />
          {saving ? t('confirmation.saving') : t('confirmation.saveWithout')}
        </button>
      </div>
    </FullScreen>
  )
}
