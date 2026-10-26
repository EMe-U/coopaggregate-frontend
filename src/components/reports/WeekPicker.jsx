import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, currentMonday, weekLabel } from './weeks'

const stepClass =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-text/10 bg-surface text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-50'

// The dropdown offers the weeks with activity (weeks, newest first) plus the current week and the
// one shown, so an empty or missing list still works. Previous and next move one calendar week,
// so a week without activity can be opened too; next stops at the current week.
export default function WeekPicker({ weekStart, weeks, onChange }) {
  const { t } = useTranslation()
  const thisMonday = currentMonday()
  const options = [...new Set([thisMonday, weekStart, ...weeks.map((week) => week.weekStart)])]
    .filter((monday) => monday <= thisMonday)
    .sort()
    .reverse()

  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface p-4 shadow-sm print:hidden">
      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, -7))}
        aria-label={t('reports.week.previous')}
        title={t('reports.week.previous')}
        className={stepClass}
      >
        <ChevronLeft size={18} />
      </button>
      <label htmlFor="report-week" className="sr-only">
        {t('reports.week.picker')}
      </label>
      <select
        id="report-week"
        value={weekStart}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-background px-3 text-sm font-medium text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-sm"
      >
        {options.map((monday) => (
          <option key={monday} value={monday}>
            {monday === thisMonday
              ? t('reports.week.thisWeek', { label: weekLabel(t, monday) })
              : weekLabel(t, monday)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, 7))}
        disabled={weekStart >= thisMonday}
        aria-label={t('reports.week.next')}
        title={t('reports.week.next')}
        className={stepClass}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
