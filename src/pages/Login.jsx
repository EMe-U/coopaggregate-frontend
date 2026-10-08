import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Eye, EyeOff, Lock, MapPin, Tractor, User } from 'lucide-react'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import LanguageSwitch from '../components/LanguageSwitch'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email, password) {
  const errors = {}
  if (!email) {
    errors.email = 'login.errors.emailRequired'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'login.errors.emailInvalid'
  }
  if (!password) {
    errors.password = 'login.errors.passwordRequired'
  }
  return errors
}

function loginErrorKey(error) {
  if (!error.response) return 'login.errors.serverUnreachable'
  if (error.response.status === 401) return 'login.errors.wrongCredentials'
  if (error.response.status === 429) return 'login.errors.tooManyAttempts'
  return 'login.errors.unknown'
}

const inputClass =
  'w-full rounded-md border border-transparent bg-background py-2.5 pl-10 text-sm text-text placeholder:text-muted/70 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const trimmedEmail = email.trim()
    const errors = validate(trimmedEmail, password)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const data = await login(trimmedEmail, password)
      signIn(data.token, remember)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(loginErrorKey(error))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-text/5 bg-surface/80 px-4 py-4 sm:px-6">
        <span className="text-lg font-bold text-primary">{t('app.name')}</span>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary-light blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-primary-light blur-3xl" />

        <div className="relative w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg sm:p-7">
          <div className="flex justify-end">
            <div className="rounded-md bg-background px-2 py-1">
              <LanguageSwitch fullNames className="text-xs" />
            </div>
          </div>

          <div className="mt-2 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Tractor size={24} />
            </div>
            <h1 className="mt-4 font-medium text-text">{t('login.portal')}</h1>
            <p className="mt-1 text-sm text-text">{t('app.cooperative')}</p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-xs text-primary">
              <MapPin size={12} />
              {t('login.location')}
            </p>
          </div>

          {formError && (
            <p role="alert" className="mt-6 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {t(formError)}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-text">
                {t('login.email')}
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`${inputClass} pr-3`}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-danger">{t(fieldErrors.email)}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm text-text">
                {t('login.password')}
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClass} pr-10`}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-text"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-danger">{t(fieldErrors.password)}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-text">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              {t('login.rememberDevice')}
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('login.submitting') : t('login.submit')}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-text/5 bg-text/3 py-6 text-center text-xs text-muted">
        {t('login.footer', { year: new Date().getFullYear() })}
      </footer>
    </div>
  )
}
