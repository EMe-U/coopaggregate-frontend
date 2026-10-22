import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { getBuyerRequest } from '../../api/buyerRequests'
import { formatDateTime, formatKg, formatPhone } from '../../utils/format'
import GradeName from '../GradeName'
import RequestStatusBadge from './RequestStatusBadge'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-text wrap-break-word">{children}</dd>
    </div>
  )
}

// The whole request, with the buyer's contact details and note, which the list does not show.
export default function RequestDetailsDialog({ requestId, onClose }) {
  const { t } = useTranslation()
  const [request, setRequest] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let ignore = false
    getBuyerRequest(requestId)
      .then((data) => {
        if (!ignore) setRequest(data)
      })
      .catch(() => {
        if (!ignore) setError(true)
      })
    return () => {
      ignore = true
    }
  }, [requestId])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-details-title"
        className="my-auto w-full max-w-md rounded-xl bg-surface p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="request-details-title" className="font-mono text-lg font-semibold text-text">
            {request?.code ?? t('buyerRequests.details.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('buyerRequests.details.close')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background"
          >
            <X size={20} />
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{t('buyerRequests.details.error')}</p>}
        {!request && !error && <div className="mt-4 h-40 animate-pulse rounded-lg bg-background" />}
        {request && (
          <dl className="mt-3 divide-y divide-text/5 text-sm">
            <Row label={t('buyerRequests.columns.status')}>
              <RequestStatusBadge status={request.status} />
            </Row>
            <Row label={t('buyerRequests.columns.grade')}>
              <GradeName name={request.gradeName} />
            </Row>
            <Row label={t('buyerRequests.columns.quantity')}>{formatKg(request.quantityKg)}</Row>
            <Row label={t('buyerRequests.details.name')}>{request.buyerName}</Row>
            <Row label={t('buyerRequests.details.phone')}>
              <a href={`tel:${request.buyerPhone}`} className="text-primary hover:underline">
                {formatPhone(request.buyerPhone)}
              </a>
            </Row>
            {request.buyerEmail && (
              <Row label={t('buyerRequests.details.email')}>
                <a href={`mailto:${request.buyerEmail}`} className="text-primary hover:underline">
                  {request.buyerEmail}
                </a>
              </Row>
            )}
            <Row label={t('buyerRequests.columns.date')}>{formatDateTime(request.createdAt)}</Row>
            {request.note && (
              <div className="py-2">
                <dt className="text-muted">{t('buyerRequests.details.note')}</dt>
                <dd className="mt-1 whitespace-pre-line rounded-lg bg-background p-3 text-text wrap-break-word">{request.note}</dd>
              </div>
            )}
            {request.publicMessage && (
              <div className="py-2">
                <dt className="text-muted">{t('buyerRequests.details.publicMessage')}</dt>
                <dd className="mt-1 whitespace-pre-line rounded-lg bg-primary-light p-3 text-primary wrap-break-word">
                  {request.publicMessage}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  )
}
