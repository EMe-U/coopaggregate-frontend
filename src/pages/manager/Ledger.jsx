import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, CalendarClock, Hash, ListChecks } from 'lucide-react'
import { findLedgerEntry, getLedgerSummary } from '../../api/ledger'
import PageTitle from '../../components/PageTitle'
import SuccessToast from '../../components/SuccessToast'
import EntryDetailsPanel from '../../components/ledger/EntryDetailsPanel'
import LedgerFilters from '../../components/ledger/LedgerFilters'
import LedgerTable from '../../components/ledger/LedgerTable'
import ReverseEntryDialog from '../../components/ledger/ReverseEntryDialog'
import VerifyPanel from '../../components/ledger/VerifyPanel'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { formatDateTime, formatNumber } from '../../utils/format'

const NO_FILTERS = { type: '', from: '', to: '', search: '' }

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-surface p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-xl font-semibold text-text">{value}</p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
        <Icon size={18} />
      </div>
    </div>
  )
}

export default function Ledger() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  // Bumped after a reversal so the table and the summary show the new entry.
  const [reloadKey, setReloadKey] = useState(0)
  const [filterValues, setFilterValues] = useState(NO_FILTERS)
  const search = useDebouncedValue(filterValues.search.trim(), 300)
  const filters = { type: filterValues.type, from: filterValues.from, to: filterValues.to, search }
  const [detail, setDetail] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [reversing, setReversing] = useState(null)
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  useEffect(() => {
    // The cards keep showing no value if the summary cannot be loaded; the table still works.
    getLedgerSummary()
      .then(setSummary)
      .catch(() => {})
  }, [reloadKey])

  const noValue = t('ledger.summary.noValue')

  function handleReversed(reversal) {
    setNotice(t('ledger.reverse.done', { id: reversing.id, reversalId: reversal.id }))
    setReversing(null)
    setDetail(null)
    setReloadKey((key) => key + 1)
  }

  // Used for links to an entry that may be on another page of the table.
  async function openEntryById(id) {
    setLookupError('')
    try {
      const entry = await findLedgerEntry(id)
      if (entry) setDetail(entry)
      else setLookupError(t('ledger.verify.entryNotFound', { id }))
    } catch {
      setLookupError(t('ledger.table.error'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
          <BookOpen size={14} />
          {t('ledger.eyebrow')}
        </p>
        <PageTitle className="mb-1">{t('ledger.title')}</PageTitle>
        <p className="max-w-2xl text-sm text-muted">{t('ledger.explanation')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label={t('ledger.summary.totalEntries')}
          value={summary ? formatNumber(summary.totalEntries) : noValue}
          icon={Hash}
        />
        <SummaryCard
          label={t('ledger.summary.lastEntry')}
          value={summary?.lastEntryAt ? formatDateTime(summary.lastEntryAt) : noValue}
          icon={CalendarClock}
        />
        <SummaryCard
          label={t('ledger.summary.entriesToday')}
          value={summary ? formatNumber(summary.entriesToday) : noValue}
          icon={ListChecks}
        />
      </div>

      <VerifyPanel onViewEntry={openEntryById} />
      {lookupError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {lookupError}
        </p>
      )}

      <section className="min-w-0 overflow-hidden rounded-xl bg-surface shadow-sm">
        <LedgerFilters values={filterValues} onChange={setFilterValues} onClear={() => setFilterValues(NO_FILTERS)} />
        <LedgerTable filters={filters} reloadKey={reloadKey} onView={setDetail} onReverse={setReversing} />
      </section>

      {detail && <EntryDetailsPanel entry={detail} onClose={() => setDetail(null)} onOpenEntry={openEntryById} />}
      {reversing && (
        <ReverseEntryDialog entry={reversing} onClose={() => setReversing(null)} onReversed={handleReversed} />
      )}
      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
