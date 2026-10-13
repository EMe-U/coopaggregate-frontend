import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Link2, X } from 'lucide-react'
import LedgerTypeBadge from './LedgerTypeBadge'
import { EntryAmount, EntryKg, EntryParty, useEntryDescription } from './ledgerDisplay'
import { formatDateTime } from '../../utils/format'

function Detail({ label, children }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-text">{children}</dd>
    </div>
  )
}

export default function EntryDetailsPanel({ entry, onClose, onOpenEntry }) {
  const { t } = useTranslation()
  const describe = useEntryDescription()
  const closeRef = useRef(null)
  const none = t('ledger.details.none')

  useEffect(() => {
    closeRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [entry.id, onClose])

  function entryLink(id) {
    return (
      <button type="button" onClick={() => onOpenEntry(id)} className="font-medium text-primary underline">
        #{id}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-details-title"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-text/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 id="entry-details-title" className="text-lg font-semibold text-text">
              {t('ledger.details.title', { id: entry.id })}
            </h2>
            <LedgerTypeBadge type={entry.type} />
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('ledger.details.close')}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-text"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="divide-y divide-text/5">
            <Detail label={t('ledger.details.date')}>{formatDateTime(entry.entryDate)}</Detail>
            <Detail label={t('ledger.details.description')}>{describe(entry)}</Detail>
            <Detail label={t('ledger.details.reference')}>
              <span className="font-mono">{entry.referenceCode ?? none}</span>
            </Detail>
            <Detail label={t('ledger.details.member')}>
              <EntryParty entry={entry} />
            </Detail>
            <Detail label={t('ledger.details.lot')}>
              {entry.lotId ? (
                <Link to={`/lots/${entry.lotId}`} className="font-mono text-primary hover:underline">
                  {entry.lotCode}
                </Link>
              ) : (
                none
              )}
            </Detail>
            <Detail label={t('ledger.details.kg')}>
              <EntryKg entry={entry} />
            </Detail>
            <Detail label={t('ledger.details.amount')}>
              <EntryAmount entry={entry} />
            </Detail>
            {entry.reversesEntryId != null && (
              <Detail label={t('ledger.details.reverses')}>{entryLink(entry.reversesEntryId)}</Detail>
            )}
            {entry.reversedByEntryId != null && (
              <Detail label={t('ledger.details.reversedBy')}>{entryLink(entry.reversedByEntryId)}</Detail>
            )}
          </dl>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('ledger.details.hash')}</p>
              <p className="mt-1 break-all rounded-lg bg-background p-3 font-mono text-xs text-text">{entry.hash}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('ledger.details.previousHash')}</p>
              <p className="mt-1 break-all rounded-lg bg-background p-3 font-mono text-xs text-muted">{entry.previousHash}</p>
            </div>
            <div className="rounded-lg bg-primary-light p-3 text-sm text-primary">
              <p className="flex items-center gap-2 font-semibold">
                <Link2 size={16} />
                {t('ledger.details.chainTitle')}
              </p>
              <p className="mt-1">{t('ledger.details.chain')}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
