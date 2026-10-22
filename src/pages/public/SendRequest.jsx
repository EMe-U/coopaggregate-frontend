import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, SendHorizonal, Truck } from 'lucide-react'
import { sendPurchaseRequest } from '../../api/public'
import usePublicInfo from '../../hooks/usePublicInfo'
import { formatKg } from '../../utils/format'
import { cleanPhone, RWANDAN_PHONE_PATTERN } from '../../utils/phone'
import { parseKg } from '../../utils/quantity'
import { publicGradeName } from './publicGrade'

const MAX_QUANTITY_KG = 100000
const inputClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60'

function Field({ id, label, optional, hint, error, children }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
        {label}
        {optional && <span className="font-normal text-muted"> {t('publicRequest.optional')}</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export default function SendRequest() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const { info, grades, reload } = usePublicInfo()
  const minOrderKg = Number(info.data?.minOrderKg) || null

  const [values, setValues] = useState({ gradeCode: searchParams.get('grade') ?? '', quantity: '', name: '', phone: '', email: '', note: '', website: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)

  const gradeList = grades.data ?? []
  const selected = gradeList.find((grade) => grade.code === values.gradeCode)

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function validate() {
    const found = {}
    if (!selected) found.gradeCode = t('publicRequest.errors.grade')
    const quantityKg = parseKg(values.quantity)
    if (values.quantity.trim() === '') found.quantity = t('publicRequest.errors.quantityRequired')
    else if (quantityKg === null || quantityKg <= 0) found.quantity = t('publicRequest.errors.quantityInvalid')
    else if (minOrderKg && quantityKg < minOrderKg) found.quantity = t('publicRequest.errors.minOrder', { kg: formatKg(minOrderKg) })
    else if (quantityKg > MAX_QUANTITY_KG) found.quantity = t('publicRequest.errors.quantityTooLarge', { kg: formatKg(MAX_QUANTITY_KG) })
    if (!values.name.trim()) found.name = t('publicRequest.errors.name')
    if (!RWANDAN_PHONE_PATTERN.test(cleanPhone(values.phone))) found.phone = t('publicRequest.errors.phone')
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = t('publicRequest.errors.email')
    return { found, quantityKg }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (sending) return
    setFormError('')
    const { found, quantityKg } = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSending(true)
    try {
      setSent(
        await sendPurchaseRequest({
          name: values.name.trim(),
          phone: cleanPhone(values.phone),
          email: values.email.trim() || null,
          gradeCode: values.gradeCode,
          quantityKg,
          note: values.note.trim() || null,
          website: values.website,
        }),
      )
    } catch (error) {
      setFormError(
        error.response ? error.response.data?.message || t('publicRequest.errors.generic') : t('publicRequest.errors.network'),
      )
    } finally {
      setSending(false)
    }
  }

  function handleAnother() {
    setSent(null)
    setValues((current) => ({ ...current, quantity: '', note: '' }))
  }

  return (
    <>
      <section className="bg-background py-8">
        <div className="mx-auto max-w-3xl px-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Truck size={14} />
            {t('publicRequest.eyebrow')}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-text">{t('publicRequest.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('publicRequest.subtitle')}</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-12">
        {sent ? (
          <section role="status" className="rounded-xl border border-primary/30 bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                <CircleCheck size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-text">{t('publicRequest.sent.title')}</h2>
                <p className="text-sm text-muted">{t('publicRequest.sent.keepCode')}</p>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-background px-4 py-3 text-center font-mono text-xl font-bold tracking-wide text-text">
              {sent.code}
            </p>
            <p className="mt-3 text-sm text-text">{t('publicRequest.sent.howToCheck')}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={`/status?code=${encodeURIComponent(sent.code)}`}
                className="flex min-h-12 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                {t('publicRequest.sent.checkStatus')}
              </Link>
              <button
                type="button"
                onClick={handleAnother}
                className="min-h-12 rounded-lg border border-text/10 px-5 text-sm font-medium text-text hover:bg-background"
              >
                {t('publicRequest.sent.another')}
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
            {(grades.error || info.error) && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {t('publicRequest.loadError')}
                <button type="button" onClick={reload} className="min-h-11 font-medium underline">
                  {t('publicRequest.retry')}
                </button>
              </div>
            )}
            {formError && (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="request-grade"
                label={t('publicRequest.grade')}
                error={errors.gradeCode}
                hint={selected?.description}
              >
                <select
                  id="request-grade"
                  value={values.gradeCode}
                  onChange={(event) => setValue('gradeCode', event.target.value)}
                  disabled={sending || !grades.data}
                  className={inputClass}
                >
                  <option value="">{grades.data ? t('publicRequest.chooseGrade') : t('publicRequest.loading')}</option>
                  {gradeList.map((grade) => (
                    <option key={grade.code} value={grade.code}>
                      {publicGradeName(grade, i18n.language)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id="request-quantity"
                label={t('publicRequest.quantity')}
                error={errors.quantity}
                hint={minOrderKg ? t('publicRequest.minOrderHint', { kg: formatKg(minOrderKg) }) : undefined}
              >
                <div className="relative">
                  <input
                    id="request-quantity"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={values.quantity}
                    onChange={(event) => setValue('quantity', event.target.value)}
                    placeholder={t('publicRequest.quantityPlaceholder')}
                    disabled={sending}
                    className={`${inputClass} pr-12`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">kg</span>
                </div>
              </Field>

              <Field id="request-name" label={t('publicRequest.name')} error={errors.name}>
                <input
                  id="request-name"
                  autoComplete="name"
                  value={values.name}
                  onChange={(event) => setValue('name', event.target.value)}
                  maxLength={150}
                  disabled={sending}
                  className={inputClass}
                />
              </Field>

              <Field id="request-phone" label={t('publicRequest.phone')} error={errors.phone} hint={t('publicRequest.phoneHint')}>
                <input
                  id="request-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={values.phone}
                  onChange={(event) => setValue('phone', event.target.value)}
                  disabled={sending}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="request-email" label={t('publicRequest.email')} optional error={errors.email}>
              <input
                id="request-email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => setValue('email', event.target.value)}
                maxLength={150}
                disabled={sending}
                className={inputClass}
              />
            </Field>

            <Field id="request-note" label={t('publicRequest.note')} optional>
              <textarea
                id="request-note"
                rows={3}
                maxLength={1000}
                value={values.note}
                onChange={(event) => setValue('note', event.target.value)}
                placeholder={t('publicRequest.notePlaceholder')}
                disabled={sending}
                className={`${inputClass} py-2`}
              />
            </Field>

            {/* Honeypot: people never see or fill this; a bot that does gets no real request. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="request-website">{t('publicRequest.honeypot')}</label>
              <input
                id="request-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={values.website}
                onChange={(event) => setValue('website', event.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending || !grades.data}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {sending ? t('publicRequest.sending') : t('publicRequest.send')}
                <SendHorizonal size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
