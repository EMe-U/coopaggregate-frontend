import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Undo2 } from 'lucide-react'
import { reverseEntry } from '../../api/ledger'
import { useEntryDescription } from './ledgerDisplay'

export default function ReverseEntryDialog({ entry, onClose, onReversed }) {
  const { t } = useTranslation()
  const describe = useEntryDescription()
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
    if (!reason.trim()) {
      setReasonError(t('ledger.reverse.reasonRequired'))
      return
    }

    setBusy(true)
    setError('')
    try {
      onReversed(await reverseEntry(entry.id, reason.trim()))
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('ledger.reverse.error'))
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
        aria-labelledby="reverse-title"
        aria-describedby="reverse-explanation"
        className="w-full max-w-md rounded-xl bg-surface p-5 shadow-lg"
      >
        <h2 id="reverse-title" className="text-lg font-semibold text-text">
          {t('ledger.reverse.title', { id: entry.id })}
        </h2>
        <p className="mt-1 text-sm text-muted">{describe(entry)}</p>
        <p id="reverse-explanation" className="mt-3 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
          {t('ledger.reverse.explanation')}
        </p>

        <label htmlFor="reverse-reason" className="mt-4 mb-1.5 block text-sm font-medium text-text">
          {t('ledger.reverse.reason')}
        </label>
        <textarea
          id="reverse-reason"
          ref={reasonRef}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            setReasonError('')
          }}
          placeholder={t('ledger.reverse.reasonPlaceholder')}
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
            {t('ledger.reverse.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Undo2 size={16} />
            {busy ? t('ledger.reverse.reversing') : t('ledger.reverse.confirm')}
          </button>
        </div>
      </form>
    </div>
  )
}
