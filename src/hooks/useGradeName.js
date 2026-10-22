import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { listGrades } from '../api/grades'
import { loadWithCache } from '../offline/cache'

// Deliveries, lots and sales only carry the grade's English name, so every grade (also inactive
// ones) is loaded once and kept here to look up its Kinyarwanda name. Saved for offline use too.
let grades = null
let loading = false
const listeners = new Set()

function setGrades(next) {
  grades = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function loadGrades() {
  if (loading || grades) return
  loading = true
  loadWithCache('gradesAll', () => listGrades({ includeInactive: true }))
    .then(({ data }) => setGrades(data))
    // Without grades the names fall back to the built-in translations.
    .catch(() => {})
    .finally(() => {
      loading = false
    })
}

// After a grade is edited in Settings, so its new names show everywhere at once.
export function updateGradeNames(saved) {
  if (grades) setGrades(grades.map((grade) => (grade.id === saved.id ? saved : grade)))
}

// Returns gradeName(englishName): the grade's nameRw when the language is Kinyarwanda and it is
// set, otherwise the built-in translation of the name, otherwise the name itself.
export default function useGradeName() {
  const { t, i18n } = useTranslation()
  const list = useSyncExternalStore(subscribe, () => grades)

  useEffect(() => {
    loadGrades()
  }, [])

  const kinyarwanda = (i18n.resolvedLanguage ?? i18n.language ?? '').startsWith('rw')
  return useCallback(
    (name) => {
      const grade = list?.find((candidate) => candidate.name === name)
      if (kinyarwanda && grade?.nameRw) return grade.nameRw
      return t(`grades.${name}`, { defaultValue: name })
    },
    [list, kinyarwanda, t],
  )
}
