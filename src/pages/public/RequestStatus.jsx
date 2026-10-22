import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleX, Clock, Search, Ticket } from 'lucide-react'
import { getRequestStatus } from '../../api/public'
import { cleanPhone, RWANDAN_PHONE_PATTERN } from '../../utils/phone'

const inputClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60'

const statusStyles = {
  PENDING: { icon: Clock, className: 'bg-warning/15 text-amber-800' },
  ACCEPTED: { icon: CircleCheck, className: 'bg-primary-light text-primary' },
  REJECTED: { icon: CircleX, className: 'bg-danger/10 text-danger' },
}

export default function RequestStatus() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    setError('')
    setResult(null)

    const found = {}
    if (!code.trim()) found.code = t('requestStatus.errors.code')
    if (!RWANDAN_PHONE_PATTERN.test(cleanPhone(phone))) found.phone = t('requestStatus.errors.phone')
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      setResult(await getRequestStatus(code.trim().toUpperCase(), cleanPhone(phone)))
    } catch (requestError) {
      if (!requestError.response) setError(t('requestStatus.errors.network'))
      else if (requestError.response.status === 404) setError(t('requestStatus.errors.notFound'))
      else setError(requestError.response.data?.message || t('requestStatus.errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const style = result && (statusStyles[result.status] ?? statusStyles.PENDING)
  const StatusIcon = style?.icon

  return (
    <>
      <section className="bg-linear-to-br from-primary to-[#0b3a1f] py-10 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
            <Ticket size={12} />
            {t('requestStatus.eyebrow')}
          </p>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{t('requestStatus.title')}</h1>
          <p className="mt-2 text-sm text-white/85">{t('requestStatus.subtitle')}</p>
        </div>
      </section>

      <div className="mx-auto max-w-xl px-4 pb-12">
        <form onSubmit={handleSubmit} noValidate className="-mt-6 space-y-4 rounded-xl bg-surface p-5 shadow-md sm:p-6">
          <div>
            <label htmlFor="status-code" className="mb-1.5 block text-sm font-medium text-text">
              {t('requestStatus.code')}
            </label>
            <input
              id="status-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setErrors((current) => ({ ...current, code: undefined }))
              }}
              placeholder="BR-2026-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={loading}
              className={`${inputClass} font-mono uppercase`}
            />
            {errors.code && <p className="mt-1 text-sm text-danger">{errors.code}</p>}
          </div>
          <div>
            <label htmlFor="status-phone" className="mb-1.5 block text-sm font-medium text-text">
              {t('requestStatus.phone')}
            </label>
            <input
              id="status-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setErrors((current) => ({ ...current, phone: undefined }))
              }}
              disabled={loading}
              className={inputClass}
            />
            {errors.phone ? (
              <p className="mt-1 text-sm text-danger">{errors.phone}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">{t('requestStatus.phoneHint')}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search size={16} />
            {loading ? t('requestStatus.checking') : t('requestStatus.check')}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {result && (
          <section role="status" className="mt-4 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{t('requestStatus.reference')}</p>
                <p className="font-mono text-lg font-semibold text-text">{result.code}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${style.className}`}>
                <StatusIcon size={16} />
                {t(`requestStatus.status.${result.status}`, { defaultValue: result.status })}
              </span>
            </div>
            {result.message && (
              <div className="mt-4 border-l-4 border-primary bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('requestStatus.notice')}</p>
                <p className="mt-1 whitespace-pre-line wrap-break-word text-sm italic text-text">{result.message}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
