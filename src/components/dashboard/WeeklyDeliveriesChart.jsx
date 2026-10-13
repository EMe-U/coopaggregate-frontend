import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import GradeName from '../GradeName'
import { formatKg } from '../../utils/format'

const GRIDLINES = [0, 25, 50, 75]

// Each grade gets its own shade of the theme green, from full strength down to a light tint.
function gradeColor(index, count) {
  const strength = count === 1 ? 100 : 100 - (index * 60) / (count - 1)
  return `color-mix(in srgb, var(--color-primary) ${strength}%, white)`
}

// Weeks only list the grades delivered in them, so collect every grade that appears.
function collectGrades(weeks) {
  const grades = new Map()
  weeks.forEach((week) => week.grades.forEach((grade) => grades.set(grade.gradeId, grade.gradeName)))
  return [...grades].sort(([a], [b]) => a - b).map(([gradeId, gradeName]) => ({ gradeId, gradeName }))
}

function gradeKg(week, gradeId) {
  return Number(week.grades.find((grade) => grade.gradeId === gradeId)?.kg ?? 0)
}

export default function WeeklyDeliveriesChart({ weeks }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(null)

  const grades = weeks ? collectGrades(weeks) : []
  // Totals are added for display only.
  const totals = weeks ? weeks.map((week) => week.grades.reduce((sum, grade) => sum + Number(grade.kg), 0)) : []
  const maxKg = Math.max(0, ...(weeks ?? []).flatMap((week) => grades.map((grade) => gradeKg(week, grade.gradeId))))
  const peakIndex = totals.indexOf(Math.max(...totals))

  function weekLabel(index) {
    if (index === weeks.length - 1) return t('dashboard.weekly.thisWeek')
    const [, month, day] = weeks[index].weekStart.split('-')
    return t('dashboard.weekly.weekOf', { date: `${day}/${month}` })
  }

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">{t('dashboard.weekly.title')}</h2>
          <p className="text-sm text-muted">{t('dashboard.weekly.subtitle')}</p>
        </div>
        {grades.length > 0 && maxKg > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text">
            {grades.map((grade, index) => (
              <li key={grade.gradeId} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: gradeColor(index, grades.length) }} />
                <GradeName name={grade.gradeName} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!weeks && <div className="h-64 animate-pulse rounded-lg bg-background" />}

      {weeks && maxKg === 0 && <p className="py-16 text-center text-sm text-muted">{t('dashboard.weekly.empty')}</p>}

      {weeks && maxKg > 0 && (
        <>
          {/* Narrow screens scroll the chart inside the card; the top padding leaves room for the value label. */}
          <div className="overflow-x-auto pt-8">
            <div className="relative" style={{ minWidth: `${weeks.length * (grades.length * 2 + 2)}rem` }}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-56">
                {GRIDLINES.map((line) => (
                  <div
                    key={line}
                    className={`absolute inset-x-0 border-t ${line === 0 ? 'border-text/20' : 'border-dashed border-text/10'}`}
                    style={{ bottom: `${line}%` }}
                  />
                ))}
              </div>
              <div className="relative flex justify-around gap-4">
                {weeks.map((week, weekIndex) => (
                  <div key={week.weekStart} className="flex flex-col items-center">
                    <div className="flex h-56 items-end gap-1">
                      {grades.map((grade, gradeIndex) => {
                        const key = `${week.weekStart}-${grade.gradeId}`
                        const kg = gradeKg(week, grade.gradeId)
                        const height = `${(kg / maxKg) * 100}%`
                        return (
                          <div key={key} className="relative flex h-full w-6 items-end">
                            <button
                              type="button"
                              aria-label={`${t(`grades.${grade.gradeName}`, { defaultValue: grade.gradeName })}, ${weekLabel(weekIndex)}: ${formatKg(kg)}`}
                              onMouseEnter={() => setActive(key)}
                              onMouseLeave={() => setActive(null)}
                              onFocus={() => setActive(key)}
                              onBlur={() => setActive(null)}
                              onClick={() => setActive(key)}
                              className="min-h-0.5 w-full rounded-t focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                              style={{ height, background: gradeColor(gradeIndex, grades.length) }}
                            />
                            {active === key && (
                              <span
                                className="absolute left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-text px-2 py-0.5 text-xs text-white"
                                style={{ bottom: height }}
                              >
                                {formatKg(kg)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-2 whitespace-nowrap text-xs text-muted">{weekLabel(weekIndex)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 border-t border-text/5 pt-3 text-sm text-muted">
            {t('dashboard.weekly.peak')}{' '}
            <span className="font-semibold text-text">
              {t('dashboard.weekly.peakValue', {
                week: weekLabel(peakIndex),
                kg: formatKg(Math.round(totals[peakIndex] * 100) / 100),
              })}
            </span>
          </p>
        </>
      )}
    </section>
  )
}
