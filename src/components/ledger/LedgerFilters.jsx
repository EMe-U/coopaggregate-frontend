import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { kigaliIsoDate } from '../../utils/format'

const TYPES = ['DELIVERY', 'LOSS', 'SALE', 'SHARE', 'PAYMENT', 'REVERSAL']

const controlClass =
  'min-h-11 rounded-lg border border-transparent bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

// values: { type, from, to, search }. The search text is debounced by the page.
export default function LedgerFilters({ values, onChange, onClear }) {
  const { t } = useTranslation()
  const today = kigaliIsoDate()
  const hasFilters = Object.values(values).some(Boolean)

  function set(name, value) {
    onChange({ ...values, [name]: value })
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-text/5 p-4">
      <div className="relative min-w-0 flex-1 basis-56">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={values.search}
          onChange={(event) => set('search', event.target.value)}
          placeholder={t('ledger.filters.searchPlaceholder')}
          aria-label={t('ledger.filters.searchLabel')}
          className={`${controlClass} w-full pl-9 placeholder:text-muted/70`}
        />
      </div>

      <select
        aria-label={t('ledger.filters.type')}
        value={values.type}
        onChange={(event) => set('type', event.target.value)}
        className={controlClass}
      >
        <option value="">{t('ledger.filters.allTypes')}</option>
        {TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`ledger.types.${type}`)}
          </option>
        ))}
      </select>

      <label className="flex flex-col text-xs text-muted">
        {t('ledger.filters.from')}
        <input
          type="date"
          value={values.from}
          max={values.to || today}
          onChange={(event) => set('from', event.target.value)}
          className={`${controlClass} mt-1 text-text`}
        />
      </label>
      <label className="flex flex-col text-xs text-muted">
        {t('ledger.filters.to')}
        <input
          type="date"
          value={values.to}
          min={values.from || undefined}
          max={today}
          onChange={(event) => set('to', event.target.value)}
          className={`${controlClass} mt-1 text-text`}
        />
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary-light"
        >
          <X size={16} />
          {t('ledger.filters.clear')}
        </button>
      )}
    </div>
  )
}
