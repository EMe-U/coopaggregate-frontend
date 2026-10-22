import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleX, MessageSquareWarning, PencilLine, RefreshCw, UserX } from 'lucide-react'
import { confirmDelivery, resendConfirmationCode, reviewDelivery } from '../../api/deliveries'
import { getSettings } from '../../api/settings'
import useGradeName from '../../hooks/useGradeName'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatDateTime, formatKg } from '../../utils/format'
import ReasonDialog from '../ReasonDialog'
import CorrectDeliveryModal from './CorrectDeliveryModal'
import DisputeDialog from './DisputeDialog'

const CODE_LENGTH = 6
// The backend lets the manager check a delivery once it has waited this long since it reached
// the server (syncedAt).
const REVIEW_AFTER_MS = 48 * 60 * 60 * 1000

// Confirms a PENDING delivery: the member received a code by SMS and gives it to the manager when
// the details are right. Used right after saving a delivery and on the delivery page.
// onChanged(delivery) receives the updated delivery, or the new one after a correction.
// onClose, when given, adds "Member not here" to leave the delivery waiting.
export default function DeliveryConfirmation({ delivery, onChanged, onClose, showDetails }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const needsInternet = useNeedsInternet()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  // null while unknown; with SMS off no code is ever sent.
  const [smsEnabled, setSmsEnabled] = useState(null)
  // Which extra step is open: notCorrect, correct, dispute or review.
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let ignore = false
    getSettings()
      .then((settings) => {
        if (!ignore) setSmsEnabled(settings.smsEnabled)
      })
      // Unknown: keep the code box, which is what the backend expects while SMS are on.
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  const codeCanArrive = smsEnabled !== false
  const overdue = Boolean(delivery.syncedAt) && Date.now() - new Date(delivery.syncedAt).getTime() > REVIEW_AFTER_MS
  const canReview = smsEnabled === false || delivery.codeResendsLeft === 0 || overdue

  async function run(request) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      return await request()
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('codeConfirmation.error'))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm(event) {
    event.preventDefault()
    if (code.length !== CODE_LENGTH) {
      setError(t('codeConfirmation.codeLength', { count: CODE_LENGTH }))
      return
    }
    const saved = await run(() => confirmDelivery(delivery.id, code))
    setCode('')
    if (saved) onChanged(saved)
  }

  async function handleResend() {
    const saved = await run(() => resendConfirmationCode(delivery.id))
    if (saved) {
      setNotice(t('codeConfirmation.resent'))
      onChanged(saved)
    }
  }

  function finish(saved) {
    setOpen(null)
    onChanged(saved)
  }

  const buttonClass =
    'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div className="space-y-4 text-left">
      {showDetails && (
        <dl className="divide-y divide-text/10 rounded-xl bg-background px-4 text-sm">
          {[
            ['member', delivery.memberName],
            ['quantity', formatKg(delivery.quantityKg)],
            ['grade', gradeName(delivery.gradeName)],
            ['date', formatDateTime(delivery.deliveredAt)],
          ].map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">{t(`codeConfirmation.details.${key}`)}</dt>
              <dd className="text-right text-base font-semibold text-text">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {codeCanArrive ? (
        <form onSubmit={handleConfirm} noValidate>
          <label htmlFor={`code-${delivery.id}`} className="block text-sm text-text">
            {t('codeConfirmation.hint')}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id={`code-${delivery.id}`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ''))
                setError('')
              }}
              placeholder="••••••"
              disabled={busy}
              className="min-h-14 w-full min-w-0 rounded-lg border border-transparent bg-background px-4 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={busy || needsInternet.offline}
              title={needsInternet.title}
              className="flex min-h-14 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CircleCheck size={18} />
              {t('codeConfirmation.confirm')}
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-amber-800">{t('codeConfirmation.smsOff')}</p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
          {notice}
        </p>
      )}

      {codeCanArrive && delivery.codeResendsLeft > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={busy || needsInternet.offline}
            className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-primary hover:bg-primary-light disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {t('codeConfirmation.resend')}
          </button>
          <span className="text-muted">{t('codeConfirmation.resendsLeft', { count: delivery.codeResendsLeft })}</span>
        </div>
      )}

      {open === 'notCorrect' ? (
        <div className="space-y-2 rounded-lg border border-text/10 p-3">
          <p className="text-sm text-text">{t('codeConfirmation.notCorrectHint')}</p>
          <button
            type="button"
            onClick={() => setOpen('correct')}
            className={`${buttonClass} bg-primary text-white hover:bg-primary/90`}
          >
            <PencilLine size={16} />
            {t('codeConfirmation.fixDelivery')}
          </button>
          <button
            type="button"
            onClick={() => setOpen('dispute')}
            className={`${buttonClass} border border-danger/30 text-danger hover:bg-danger/5`}
          >
            <MessageSquareWarning size={16} />
            {t('codeConfirmation.stillDisagrees')}
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setOpen('notCorrect')}
            disabled={busy || needsInternet.offline}
            className={`${buttonClass} border border-danger/30 text-danger hover:bg-danger/5`}
          >
            <CircleX size={16} />
            {t('codeConfirmation.notCorrect')}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className={`${buttonClass} bg-background text-text hover:bg-text/10`}>
              <UserX size={16} />
              {t('codeConfirmation.memberNotHere')}
            </button>
          )}
        </div>
      )}

      {canReview && (
        <button
          type="button"
          onClick={() => setOpen('review')}
          disabled={busy || needsInternet.offline}
          title={needsInternet.title}
          className={`${buttonClass} border border-primary/30 text-primary hover:bg-primary-light`}
        >
          <CircleCheck size={16} />
          {t('codeConfirmation.review')}
        </button>
      )}

      {open === 'correct' && (
        <CorrectDeliveryModal delivery={delivery} onClose={() => setOpen('notCorrect')} onCorrected={finish} />
      )}
      {open === 'dispute' && (
        <DisputeDialog delivery={delivery} onClose={() => setOpen('notCorrect')} onDisputed={finish} />
      )}
      {open === 'review' && (
        <ReasonDialog
          title={t('codeConfirmation.reviewTitle', { code: delivery.receiptCode })}
          explanation={t('codeConfirmation.reviewExplanation')}
          fieldLabel={t('confirmation.resolve.note')}
          placeholder={t('confirmation.resolve.notePlaceholder')}
          requiredMessage={t('confirmation.resolve.noteRequired')}
          confirmLabel={t('codeConfirmation.review')}
          tone="primary"
          onConfirm={async (note) => finish(await reviewDelivery(delivery.id, note))}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
