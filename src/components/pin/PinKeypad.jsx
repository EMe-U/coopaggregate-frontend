import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Delete } from 'lucide-react'
import { PIN_LENGTH } from '../../utils/pin'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

// A large keypad for the member to type a PIN on the manager's phone. The PIN is only shown as
// dots. onComplete runs once all digits are typed. A physical keyboard works too.
export default function PinKeypad({ value, onChange, onComplete, disabled }) {
  const { t } = useTranslation()

  function press(key) {
    if (disabled) return
    if (key === 'clear') onChange('')
    else if (key === 'back') onChange(value.slice(0, -1))
    else if (value.length < PIN_LENGTH) {
      const next = value + key
      onChange(next)
      if (next.length === PIN_LENGTH) onComplete?.(next)
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') press('back')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="mb-6 flex justify-center gap-4" aria-live="polite" aria-label={t('pin.entered', { count: value.length })}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className={`h-5 w-5 rounded-full border-2 border-primary ${index < value.length ? 'bg-primary' : 'bg-transparent'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key) => {
          const label = key === 'clear' ? t('pin.clear') : key === 'back' ? <Delete size={26} /> : key
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={disabled}
              aria-label={key === 'back' ? t('pin.backspace') : undefined}
              className={`flex h-16 items-center justify-center rounded-2xl text-2xl font-semibold disabled:opacity-50 ${
                key === 'clear' || key === 'back'
                  ? 'bg-background text-base text-muted hover:bg-text/10'
                  : 'bg-primary-light text-primary hover:bg-primary/15 active:bg-primary active:text-white'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
