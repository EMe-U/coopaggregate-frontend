import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, Undo2 } from 'lucide-react'
import useNeedsInternet from '../hooks/useNeedsInternet'

// Asks for a required reason before reversing a record, or a note for other decisions (tone
// "primary"; optional lets the text stay empty). onConfirm(text) sends the request; when it fails, the server's message is shown (for
// example the 409 explaining why a record cannot be reversed) and the dialog stays open.
export default function ReasonDialog({
  title,
  summary,
  explanation,
  confirmLabel,
  onConfirm,
  onClose,
  fieldLabel,
  placeholder,
  requiredMessage,
  optional,
  tone = 'danger',
}) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const reasonRef = useRef(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    reasonRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    if (!optional && !reason.trim()) {
      setReasonError(requiredMessage ?? t('reversal.reasonRequired'))
      return
    }

    setBusy(true)
    setError('')
    try {
      await onConfirm(reason.trim())
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('reversal.error'))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reason-dialog-title"
        aria-describedby="reason-dialog-explanation"
        className="w-full max-w-md rounded-xl bg-surface p-5 text-left shadow-lg"
      >
        <h2 id="reason-dialog-title" className="text-lg font-semibold text-text">
          {title}
        </h2>
        {summary && <p className="mt-1 text-sm text-muted">{summary}</p>}
        <p id="reason-dialog-explanation" className="mt-3 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
          {explanation}
        </p>

        <label htmlFor="reason-dialog-reason" className="mt-4 mb-1.5 block text-sm font-medium text-text">
          {fieldLabel ?? t('reversal.reason')}
        </label>
        <textarea
          id="reason-dialog-reason"
          ref={reasonRef}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            setReasonError('')
          }}
          placeholder={placeholder ?? t('reversal.reasonPlaceholder')}
          disabled={busy}
          aria-invalid={Boolean(reasonError)}
          className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {reasonError && <p className="mt-1 text-sm text-danger">{reasonError}</p>}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-12 flex-1 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
          >
            {t('reversal.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy || needsInternet.offline}
            title={needsInternet.title}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              tone === 'danger' ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {tone === 'danger' ? <Undo2 size={16} /> : <CircleCheck size={16} />}
            {busy ? t('reversal.reversing') : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
