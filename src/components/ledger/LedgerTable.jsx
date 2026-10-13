import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Eye, Undo2 } from 'lucide-react'
import { listLedger } from '../../api/ledger'
import ActionsMenu from '../ActionsMenu'
import EmptyState from '../EmptyState'
import Pagination from '../Pagination'
import LedgerTypeBadge from './LedgerTypeBadge'
import { EntryAmount, EntryKg, EntryParty, saleBuyer, useEntryDescription } from './ledgerDisplay'
import { formatDate, formatTime, kigaliIsoDate } from '../../utils/format'

const PAGE_SIZE = 20

export function canReverse(entry) {
  return entry.type !== 'REVERSAL' && entry.reversedByEntryId == null
}

function EntryNote({ entry }) {
  const { t } = useTranslation()
  if (entry.reversedByEntryId != null) {
    return <p className="text-xs font-medium text-danger">{t('ledger.table.reversedBy', { id: entry.reversedByEntryId })}</p>
  }
  if (entry.reversesEntryId != null) {
    return <p className="text-xs font-medium text-muted">{t('ledger.table.reverses', { id: entry.reversesEntryId })}</p>
  }
  return null
}

function EntryMenu({ entry, onView, onReverse }) {
  const { t } = useTranslation()
  const actions = []
  if (onView) actions.push({ key: 'view', icon: Eye, label: t('ledger.actions.view'), run: () => onView(entry) })
  if (onReverse && canReverse(entry)) {
    actions.push({ key: 'reverse', icon: Undo2, label: t('ledger.actions.reverse'), run: () => onReverse(entry), danger: true })
  }
  if (actions.length === 0) return null
  return <ActionsMenu label={t('ledger.actions.menu', { id: entry.id })} actions={actions} />
}

export default function LedgerTable({ filters = {}, reloadKey, onView, onReverse }) {
  const { t } = useTranslation()
  const describe = useEntryDescription()

  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const filterKey = JSON.stringify(filters)

  // A new filter starts again from the first page.
  useEffect(() => {
    setPage(0)
  }, [filterKey])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setLoadError(false)
    listLedger({ ...JSON.parse(filterKey), page, size: PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [filterKey, page, reloadKey, retryKey])

  if (loadError) {
    return (
      <EmptyState title={t('ledger.table.error')}>
        <button
          type="button"
          onClick={() => setRetryKey((key) => key + 1)}
          className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
        >
          {t('ledger.table.retry')}
        </button>
      </EmptyState>
    )
  }

  if (!result) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-12 animate-pulse rounded bg-background" />
        ))}
      </div>
    )
  }

  if (result.totalElements === 0) {
    const filtered = Object.values(filters).some(Boolean)
    return <EmptyState icon={BookOpen} title={filtered ? t('ledger.table.noResults') : t('ledger.table.empty')} />
  }

  const cell = 'px-2 py-3 align-top'
  const from = result.page * result.size + 1

  return (
    <div className={loading ? 'opacity-60' : undefined}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs text-muted">
            <tr>
              {['date', 'type', 'description', 'reference', 'member', 'lot'].map((column) => (
                <th key={column} className="px-2 py-3 font-semibold">
                  {t(`ledger.table.${column}`)}
                </th>
              ))}
              {['kg', 'amount'].map((column) => (
                <th key={column} className="px-2 py-3 text-right font-semibold">
                  {t(`ledger.table.${column}`)}
                </th>
              ))}
              <th className="px-2 py-3 font-semibold">{t('ledger.table.hash')}</th>
              <th className="px-2 py-3">
                <span className="sr-only">{t('ledger.table.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {result.content.map((entry) => (
              <tr key={entry.id} className={entry.reversedByEntryId != null ? 'opacity-60' : undefined}>
                <td className={`${cell} whitespace-nowrap`}>
                  <span className="block">{formatDate(kigaliIsoDate(new Date(entry.entryDate)))}</span>
                  <span className="block text-xs text-muted">
                    {formatTime(entry.entryDate)} · #{entry.id}
                  </span>
                </td>
                <td className={cell}>
                  <LedgerTypeBadge type={entry.type} />
                </td>
                <td className={`${cell} min-w-48`}>
                  <p className="text-text">{describe(entry)}</p>
                  <EntryNote entry={entry} />
                </td>
                <td className={`${cell} whitespace-nowrap font-mono text-xs`}>{entry.referenceCode ?? '–'}</td>
                <td className={cell}>
                  <EntryParty entry={entry} />
                </td>
                <td className={`${cell} whitespace-nowrap font-mono text-xs`}>
                  {entry.lotId ? (
                    <Link to={`/lots/${entry.lotId}`} className="text-primary hover:underline">
                      {entry.lotCode}
                    </Link>
                  ) : (
                    '–'
                  )}
                </td>
                <td className={`${cell} whitespace-nowrap text-right`}>
                  <EntryKg entry={entry} />
                </td>
                <td className={`${cell} whitespace-nowrap text-right font-medium`}>
                  <EntryAmount entry={entry} />
                </td>
                <td className={`${cell} font-mono text-xs text-muted`}>
                  <span title={entry.hash}>{entry.shortHash}</span>
                </td>
                <td className="px-1 py-1.5 text-right align-top">
                  <EntryMenu entry={entry} onView={onView} onReverse={onReverse} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-text/5 md:hidden">
        {result.content.map((entry) => (
          <li key={entry.id} className={`p-4 ${entry.reversedByEntryId != null ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2">
              <LedgerTypeBadge type={entry.type} />
              <span className="text-xs text-muted">
                #{entry.id} · {formatDate(kigaliIsoDate(new Date(entry.entryDate)))} {formatTime(entry.entryDate)}
              </span>
              <div className="ml-auto -mr-2">
                <EntryMenu entry={entry} onView={onView} onReverse={onReverse} />
              </div>
            </div>
            <p className="mt-2 text-sm text-text">{describe(entry)}</p>
            <EntryNote entry={entry} />
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">{t('ledger.table.kg')}</dt>
                <dd>
                  <EntryKg entry={entry} />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">{t('ledger.table.amount')}</dt>
                <dd className="font-medium">
                  <EntryAmount entry={entry} />
                </dd>
              </div>
              {(entry.memberId || saleBuyer(entry)) && (
                <div className="col-span-2 flex justify-between gap-2">
                  <dt className="text-muted">{t('ledger.table.member')}</dt>
                  <dd>
                    <EntryParty entry={entry} />
                  </dd>
                </div>
              )}
              <div className="col-span-2 flex justify-between gap-2 font-mono text-xs text-muted">
                <dt>{entry.referenceCode ?? ''}</dt>
                <dd title={entry.hash}>{entry.shortHash}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="border-t border-text/5 bg-background/60 px-4 py-3">
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          summary={t('ledger.table.showing', { from, to: from + result.content.length - 1, total: result.totalElements })}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
