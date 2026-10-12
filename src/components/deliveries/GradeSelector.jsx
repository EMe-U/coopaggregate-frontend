import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listGrades } from '../../api/grades'
import GradeName from '../GradeName'

export default function GradeSelector({ gradeId, onChange, disabled }) {
  const { t } = useTranslation()

  const [grades, setGrades] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    listGrades()
      .then((data) => {
        if (!ignore) setGrades(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  if (loadError) {
    return (
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 text-sm text-danger">
        {t('deliveries.grade.error')}
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="min-h-11 font-medium underline"
        >
          {t('deliveries.grade.retry')}
        </button>
      </div>
    )
  }

  if (!grades) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-12 animate-pulse rounded-lg bg-background" />
        ))}
      </div>
    )
  }

  if (grades.length === 0) {
    return <p className="text-sm text-muted">{t('deliveries.grade.none')}</p>
  }

  return (
    <div role="radiogroup" aria-labelledby="grade-label" className="grid grid-cols-3 gap-2">
      {grades.map((grade) => {
        const selected = grade.id === gradeId
        return (
          <button
            key={grade.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(grade)}
            className={`min-h-12 rounded-lg px-2 text-base font-medium transition-colors disabled:cursor-not-allowed ${
              selected ? 'bg-primary text-white shadow-sm' : 'bg-background text-text hover:bg-primary-light'
            }`}
          >
            <GradeName name={grade.name} />
          </button>
        )
      })}
    </div>
  )
}
