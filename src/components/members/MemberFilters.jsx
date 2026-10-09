import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

const statuses = ['all', 'active', 'inactive']

export default function MemberFilters({ search, onSearchChange, status, onStatusChange }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('members.search.placeholder')}
          aria-label={t('members.search.label')}
          className="w-full rounded-md border border-transparent bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">{t('members.filter.label')}</span>
        <div className="flex rounded-md bg-background p-0.5">
          {statuses.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => onStatusChange(value)}
              className={`rounded px-3 py-1 ${
                status === value ? 'bg-surface font-medium text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              {t(`members.filter.${value}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
