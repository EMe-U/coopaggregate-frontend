import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleAlert, CircleCheck, KeyRound, ShieldCheck, UserCog } from 'lucide-react'
import { changePassword } from '../../api/auth'
import { verifyLedger } from '../../api/ledger'
import { useAuth } from '../../context/AuthContext'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatTime } from '../../utils/format'
import SettingsSection from './SettingsSection'
import { inputClass, labelClass } from './fieldClasses'

const MIN_PASSWORD = 8
const MAX_PASSWORD = 72

export function LedgerIntegritySection() {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const [result, setResult] = useState(null)
  const [checkedAt, setCheckedAt] = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(false)

  async function verify() {
    setChecking(true)
    setError(false)
    try {
      setResult(await verifyLedger())
      setCheckedAt(new Date().toISOString())
    } catch {
      setError(true)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    verify()
  }, [])

  return (
    <SettingsSection icon={ShieldCheck} title={t('settings.ledger.title')} subtitle={t('settings.ledger.subtitle')}>
      <dl className="space-y-2 rounded-lg bg-background p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted">{t('settings.ledger.status')}</dt>
          <dd>
            {error && <span className="text-danger">{t('settings.ledger.error')}</span>}
            {!error && !result && <span className="text-muted">{t('settings.ledger.checking')}</span>}
            {!error && result && (
              <span
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                  result.valid ? 'bg-primary-light text-primary' : 'bg-danger/10 text-danger'
                }`}
              >
                {result.valid ? <CircleCheck size={12} /> : <CircleAlert size={12} />}
                {result.valid
                  ? t('settings.ledger.valid', { count: result.checkedEntries })
                  : t('settings.ledger.broken', { id: result.firstBrokenEntryId })}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted">{t('settings.ledger.lastCheck')}</dt>
          <dd className="text-text">{checkedAt ? formatTime(checkedAt) : '–'}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={verify}
        disabled={checking || needsInternet.offline}
        title={needsInternet.title}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        <ShieldCheck size={16} />
        {checking ? t('settings.ledger.checking') : t('settings.ledger.verify')}
      </button>
    </SettingsSection>
  )
}

export function ManagerAccountSection({ onChanged }) {
  const { t } = useTranslation()
  const { manager } = useAuth()
  const needsInternet = useNeedsInternet()
  const [form, setForm] = useState({ current: '', next: '', repeat: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setDone(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    if (!form.current || !form.next) setError(t('settings.account.allRequired'))
    else if (form.next.length < MIN_PASSWORD) setError(t('settings.account.tooShort', { count: MIN_PASSWORD }))
    else if (form.next.length > MAX_PASSWORD) setError(t('settings.account.tooLong', { count: MAX_PASSWORD }))
    else if (form.next !== form.repeat) setError(t('settings.account.noMatch'))
    else if (form.next === form.current) setError(t('settings.account.same'))
    else {
      setSaving(true)
      try {
        await changePassword(form.current, form.next)
        setForm({ current: '', next: '', repeat: '' })
        setDone(true)
        onChanged()
      } catch (requestError) {
        setError(requestError.response?.data?.message || t('settings.account.error'))
      } finally {
        setSaving(false)
      }
    }
  }

  const fields = [
    { key: 'current', autoComplete: 'current-password' },
    { key: 'next', autoComplete: 'new-password' },
    { key: 'repeat', autoComplete: 'new-password' },
  ]

  return (
    <SettingsSection
      icon={UserCog}
      title={t('settings.account.title')}
      subtitle={manager ? t('settings.account.subtitle', { name: manager.name }) : undefined}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        {fields.map(({ key, autoComplete }) => (
          <div key={key}>
            <label htmlFor={`password-${key}`} className={labelClass}>
              {t(`settings.account.${key}`)}
            </label>
            <input
              id={`password-${key}`}
              type="password"
              autoComplete={autoComplete}
              value={form[key]}
              onChange={(event) => setField(key, event.target.value)}
              placeholder={key === 'next' ? t('settings.account.hint', { count: MIN_PASSWORD }) : undefined}
              disabled={saving}
              className={inputClass}
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-primary">
            <CircleCheck size={16} />
            {t('settings.account.done')}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || needsInternet.offline}
          title={needsInternet.title}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          <KeyRound size={16} />
          {saving ? t('settings.saving') : t('settings.account.submit')}
        </button>
      </form>
    </SettingsSection>
  )
}
