import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

// Covers the whole screen while the phone is in the member's hands, so they only see their step.
export default function FullScreen({ label, onClose, children }) {
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 overflow-y-auto bg-surface">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pin.close')}
          className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full text-muted hover:bg-background"
        >
          <X size={24} />
        </button>
      )}
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16 text-center">{children}</div>
    </div>
  )
}
