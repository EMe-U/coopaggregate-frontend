import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
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
  'w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      signIn(data.token)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(loginErrorKey(error))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSwitch />
        </div>

        <div className="rounded-xl bg-surface p-6 shadow-sm">
          <p className="text-lg font-bold text-primary">{t('app.name')}</p>
          <p className="mb-6 text-xs text-muted">{t('app.cooperative')}</p>

          <h1 className="text-2xl font-semibold text-text">{t('login.title')}</h1>
          <p className="mb-6 text-sm text-muted">{t('login.subtitle')}</p>

          {formError && (
            <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {t(formError)}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-danger">{t(fieldErrors.email)}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('login.submitting') : t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
