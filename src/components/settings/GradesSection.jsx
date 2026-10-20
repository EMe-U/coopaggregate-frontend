import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers } from 'lucide-react'
import { listGrades, updateGrade } from '../../api/grades'
import SettingsSection, { SaveBar } from './SettingsSection'
import Switch from './Switch'
import { inputClass, labelClass } from './fieldClasses'

const TEXT_FIELDS = ['name', 'nameRw', 'sizeInfo', 'packaging']

function toDraft(grade) {
  return {
    name: grade.name ?? '',
    nameRw: grade.nameRw ?? '',
    active: grade.active,
    noMinimum: grade.floorPricePerKg == null,
    floorPricePerKg: grade.floorPricePerKg == null ? '' : String(grade.floorPricePerKg),
    description: grade.description ?? '',
    sizeInfo: grade.sizeInfo ?? '',
    packaging: grade.packaging ?? '',
  }
}

const blankToNull = (text) => (text.trim() === '' ? null : text.trim())

// One grade with its own Save. The code is fixed, so it is only shown.
function GradeCard({ grade, onSaved }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => toDraft(grade))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(grade))
  const id = (field) => `grade-${grade.id}-${field}`

  function setField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setMessage(null)
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      setMessage({ error: t('settings.grades.nameRequired') })
      return
    }
    if (!draft.noMinimum && !/^\d+$/.test(draft.floorPricePerKg.trim())) {
      setMessage({ error: t('settings.errors.wholeNumber') })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const saved = await updateGrade(grade.id, {
        name: draft.name.trim(),
        nameRw: blankToNull(draft.nameRw),
        active: draft.active,
        floorPricePerKg: draft.noMinimum ? null : Number(draft.floorPricePerKg),
        description: blankToNull(draft.description),
        sizeInfo: blankToNull(draft.sizeInfo),
        packaging: blankToNull(draft.packaging),
      })
      onSaved(saved)
      setDraft(toDraft(saved))
      setMessage({ ok: t('settings.saved') })
    } catch (error) {
      setMessage({ error: error.response?.data?.message || t('settings.saveError') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className={`rounded-xl border border-text/10 p-4 ${draft.active ? '' : 'bg-background/60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            {grade.code}
          </span>
          <div>
            <p className="font-semibold text-text">{grade.name}</p>
            <p className="text-xs text-muted">{t('settings.grades.code', { code: grade.code })}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-text">
          {draft.active ? t('settings.grades.active') : t('settings.grades.inactive')}
          <Switch
            checked={draft.active}
            onChange={(checked) => setField('active', checked)}
            label={t('settings.grades.activeLabel', { code: grade.code })}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((field) => (
          <div key={field}>
            <label htmlFor={id(field)} className={labelClass}>
              {t(`settings.grades.${field}`)}
            </label>
            <input
              id={id(field)}
              type="text"
              value={draft[field]}
              onChange={(event) => setField(field, event.target.value)}
              maxLength={field.startsWith('name') ? 50 : 100}
              className={inputClass}
            />
          </div>
        ))}

        <div>
          <label htmlFor={id('floor')} className={labelClass}>
            {t('settings.grades.floorPrice')}
          </label>
          <div className="relative">
            <input
              id={id('floor')}
              type="text"
              inputMode="numeric"
              value={draft.noMinimum ? '' : draft.floorPricePerKg}
              onChange={(event) => setField('floorPricePerKg', event.target.value)}
              disabled={draft.noMinimum}
              placeholder={draft.noMinimum ? t('settings.grades.noMinimum') : undefined}
              className={`${inputClass} pr-20`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              {t('settings.deduction.unit')}
            </span>
          </div>
          <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={draft.noMinimum}
              onChange={(event) => setField('noMinimum', event.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            {t('settings.grades.noMinimum')}
          </label>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={id('description')} className={labelClass}>
            {t('settings.grades.description')}
          </label>
          <textarea
            id={id('description')}
            rows={2}
            maxLength={2000}
            value={draft.description}
            onChange={(event) => setField('description', event.target.value)}
            className={`${inputClass} py-2`}
          />
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} message={message} onSave={handleSave} />
    </li>
  )
}

// Every grade, also inactive ones. Grades A, B and C are fixed, so there is no "Add grade".
// onChanged runs after a grade is saved, so the change history can reload.
export default function GradesSection({ onChanged }) {
  const { t } = useTranslation()
  const [grades, setGrades] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let ignore = false
    listGrades({ includeInactive: true })
      .then((data) => {
        if (!ignore) setGrades(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [])

  function handleSaved(saved) {
    setGrades((current) => current.map((grade) => (grade.id === saved.id ? saved : grade)))
    onChanged()
  }

  return (
    <SettingsSection icon={Layers} title={t('settings.grades.title')} subtitle={t('settings.grades.subtitle')}>
      {loadError && <p className="text-sm text-danger">{t('settings.grades.loadError')}</p>}
      {!loadError && !grades && <div className="h-40 animate-pulse rounded-lg bg-background" />}
      {grades && (
        <ul className="space-y-4">
          {grades.map((grade) => (
            <GradeCard key={grade.id} grade={grade} onSaved={handleSaved} />
          ))}
        </ul>
      )}
    </SettingsSection>
  )
}
