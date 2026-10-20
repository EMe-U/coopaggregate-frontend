import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, HandHeart } from 'lucide-react'
import { setMemberPin } from '../../api/members'
import { isTrivialPin } from '../../utils/pin'
import FullScreen from '../pin/FullScreen'
import PinKeypad from '../pin/PinKeypad'

const bigButton =
  'flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-lg font-semibold text-white hover:bg-primary/90 disabled:opacity-60'

// The member chooses their PIN on the manager's phone and types it twice. The PIN only lives in
// this component's state and is forgotten as soon as it has been sent.
export default function SetPinFlow({ member, onClose, onSaved }) {
  const { t } = useTranslation()
  const [step, setStep] = useState('handover')
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startAgain(message) {
    setFirst('')
    setSecond('')
    setError(message)
    setStep('first')
  }

  function handleFirst(pin) {
    if (isTrivialPin(pin)) {
      startAgain(t('pin.set.tooEasy'))
      return
    }
    setError('')
    setStep('second')
  }

  async function handleSecond(pin) {
    if (pin !== first) {
      startAgain(t('pin.set.noMatch'))
      return
    }
    setSaving(true)
    try {
      await setMemberPin(member.id, pin)
      setFirst('')
      setSecond('')
      setStep('done')
    } catch (requestError) {
      startAgain(requestError.response?.data?.message || t('pin.set.error'))
    } finally {
      setSaving(false)
    }
  }

  const close = saving ? undefined : step === 'done' ? onSaved : onClose

  return (
    <FullScreen label={t('pin.set.title', { name: member.fullName })} onClose={close}>
      {step === 'handover' && (
        <>
          <HandHeart size={56} className="mx-auto text-primary" />
          <h1 className="mt-4 text-2xl font-semibold text-text">{t('pin.handTo', { name: member.fullName })}</h1>
          <p className="mt-2 text-muted">{t('pin.set.handoverHint')}</p>
          <button type="button" onClick={() => setStep('first')} className={`${bigButton} mt-8`}>
            {t('pin.set.start')}
          </button>
        </>
      )}

      {(step === 'first' || step === 'second') && (
        <>
          <h1 className="text-2xl font-semibold text-text">
            {step === 'first' ? t('pin.set.chooseTitle') : t('pin.set.repeatTitle')}
          </h1>
          <p className="mt-2 mb-6 text-muted">{t('pin.coverHint')}</p>
          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-danger">
              {error}
            </p>
          )}
          {step === 'first' ? (
            <PinKeypad key="first" value={first} onChange={setFirst} onComplete={handleFirst} />
          ) : (
            <PinKeypad key="second" value={second} onChange={setSecond} onComplete={handleSecond} disabled={saving} />
          )}
          {saving && <p className="mt-4 text-muted">{t('pin.set.saving')}</p>}
        </>
      )}

      {step === 'done' && (
        <>
          <CircleCheck size={64} className="mx-auto text-primary" />
          <h1 className="mt-4 text-2xl font-semibold text-text">{t('pin.set.done')}</h1>
          <p className="mt-2 text-muted">{t('pin.set.handBack')}</p>
          <button type="button" onClick={onSaved} className={`${bigButton} mt-8`}>
            {t('pin.set.finish')}
          </button>
        </>
      )}
    </FullScreen>
  )
}
