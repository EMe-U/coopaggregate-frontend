import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, HandCoins, Save, TriangleAlert } from 'lucide-react'
import { listGrades } from '../../api/grades'
import { listAllLots } from '../../api/lots'
import { recordSale } from '../../api/sales'
import { formatKg, formatMoney, kigaliIsoDate } from '../../utils/format'
import { parseKg } from '../../utils/quantity'
import BuyerPicker from './BuyerPicker'

const PRICE_PATTERN = /^\d+$/

const fieldClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-70'

function emptyForm(lotId = '') {
  return { buyer: null, lotId, date: kigaliIsoDate(), quantityText: '', priceText: '' }
}

function Field({ htmlFor, id, label, error, hint, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} id={id} className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : hint}
    </div>
  )
}

function SaleResult({ sale, onRecordAnother }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg bg-primary-light p-4 text-primary">
        <CircleCheck size={22} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{t('sales.result.title', { code: sale.saleCode })}</p>
          <p className="text-2xl font-semibold">{t('sales.result.total', { amount: formatMoney(sale.totalAmountRwf) })}</p>
          <p className="text-sm">
            {sale.lotCode} · {sale.buyerName} · {formatKg(sale.quantityKg)} × {formatMoney(sale.pricePerKg)}
          </p>
        </div>
      </div>
      {sale.belowFloor && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          {t('sales.result.belowFloor')}
        </p>
      )}
      {sale.lotStatus === 'SOLD' && (
        <p className="rounded-lg bg-background p-3 text-sm font-medium text-text">
          {t('sales.result.lotSold', { code: sale.lotCode })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRecordAnother}
          className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <HandCoins size={16} />
          {t('sales.result.recordAnother')}
        </button>
        <Link
          to={`/lots/${sale.lotId}`}
          className="flex min-h-12 items-center rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
        >
          {sale.lotCode}
        </Link>
      </div>
    </div>
  )
}

export default function SaleForm({ initialLotId, onSaved }) {
  const { t } = useTranslation()
  const today = kigaliIsoDate()

  const [lots, setLots] = useState(null)
  const [lotsError, setLotsError] = useState(false)
  const [lotsReloadKey, setLotsReloadKey] = useState(0)
  const [grades, setGrades] = useState([])

  const [form, setForm] = useState(() => emptyForm(initialLotId ?? ''))
  // Created once per sale and reused on every retry, so a double tap or a retry after a lost
  // response returns the sale that was already saved instead of saving it again.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSale, setSavedSale] = useState(null)

  useEffect(() => {
    let ignore = false
    setLotsError(false)
    listAllLots('CLOSED')
      .then((data) => {
        if (!ignore) setLots(data.filter((lot) => Number(lot.remainingKg) > 0))
      })
      .catch(() => {
        if (!ignore) setLotsError(true)
      })
    return () => {
      ignore = true
    }
  }, [lotsReloadKey])

  useEffect(() => {
    // Only used for the floor price warning, so the form still works without it.
    listGrades()
      .then(setGrades)
      .catch(() => setGrades([]))
  }, [])

  const lot = lots?.find((candidate) => String(candidate.id) === String(form.lotId))
  const quantityKg = parseKg(form.quantityText)
  const pricePerKg = PRICE_PATTERN.test(form.priceText.trim()) ? Number(form.priceText.trim()) : null
  // Preview only; the saved total comes from the backend.
  const previewTotal = quantityKg > 0 && pricePerKg > 0 ? Math.round(quantityKg * pricePerKg) : null
  const floorPrice = grades.find((grade) => grade.name === lot?.gradeName)?.floorPricePerKg
  const belowFloor = Boolean(floorPrice) && pricePerKg > 0 && pricePerKg < floorPrice

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function validate() {
    const fieldErrors = {}
    if (!form.buyer) fieldErrors.buyer = t('sales.form.errors.buyerRequired')
    if (!lot) fieldErrors.lotId = t('sales.form.errors.lotRequired')
    if (form.quantityText.trim() === '') fieldErrors.quantityText = t('sales.form.errors.quantityRequired')
    else if (quantityKg === null || quantityKg <= 0) fieldErrors.quantityText = t('sales.form.errors.quantityInvalid')
    else if (lot && quantityKg > Number(lot.remainingKg)) {
      fieldErrors.quantityText = t('sales.form.errors.quantityTooLarge', { kg: formatKg(lot.remainingKg) })
    }
    if (form.priceText.trim() === '') fieldErrors.priceText = t('sales.form.errors.priceRequired')
    else if (!pricePerKg) fieldErrors.priceText = t('sales.form.errors.priceInvalid')
    if (!form.date) fieldErrors.date = t('sales.form.errors.dateRequired')
    else if (form.date > today) fieldErrors.date = t('sales.form.errors.dateFuture')
    return fieldErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving || savedSale) return
    setFormError('')

    const fieldErrors = validate()
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSaving(true)
    try {
      const sale = await recordSale({
        clientUuid,
        lotId: lot.id,
        buyerId: form.buyer.id,
        quantityKg,
        pricePerKg,
        soldAt: form.date,
      })
      setSavedSale(sale)
      onSaved?.(sale)
    } catch (error) {
      if (!error.response) setFormError(t('sales.form.errors.serverUnreachable'))
      else setFormError(error.response.data?.message || t('sales.form.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm(emptyForm())
    setErrors({})
    setFormError('')
    setSavedSale(null)
    setClientUuid(crypto.randomUUID())
  }

  function handleRecordAnother() {
    reset()
    setLotsReloadKey((key) => key + 1)
  }

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <HandCoins size={20} className="text-primary" />
          {t('sales.form.title')}
        </h2>
        <p className="text-sm text-muted">{t('sales.form.subtitle')}</p>
      </div>

      {savedSale ? (
        <SaleResult sale={savedSale} onRecordAnother={handleRecordAnother} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {formError && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Field htmlFor="buyer-search" label={t('sales.form.buyer')} error={errors.buyer}>
              <BuyerPicker buyer={form.buyer} onChange={(buyer) => setField('buyer', buyer)} disabled={saving} />
            </Field>

            <Field
              htmlFor="sale-lot"
              label={t('sales.form.lot')}
              error={errors.lotId}
              hint={
                lot && (
                  <p className="mt-1 text-xs text-primary">
                    {t('sales.form.available', { kg: formatKg(lot.remainingKg), code: lot.code })}
                  </p>
                )
              }
            >
              {lotsError ? (
                <p className="text-sm text-danger">{t('lots.table.error')}</p>
              ) : (
                <select
                  id="sale-lot"
                  value={form.lotId}
                  onChange={(event) => setField('lotId', event.target.value)}
                  disabled={!lots || saving}
                  className={fieldClass}
                >
                  <option value="">{lots?.length === 0 ? t('sales.form.noLots') : t('sales.form.chooseLot')}</option>
                  {lots?.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {t('sales.form.lotOption', {
                        code: candidate.code,
                        grade: t(`grades.${candidate.gradeName}`, { defaultValue: candidate.gradeName }),
                        kg: formatKg(candidate.remainingKg),
                      })}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Field htmlFor="sale-date" label={t('sales.form.date')} error={errors.date}>
              <input
                id="sale-date"
                type="date"
                value={form.date}
                max={today}
                onChange={(event) => setField('date', event.target.value)}
                disabled={saving}
                className={fieldClass}
              />
            </Field>

            <Field
              htmlFor="sale-quantity"
              label={t('sales.form.quantity')}
              error={errors.quantityText}
              hint={
                lot && (
                  <p className="mt-1 text-xs text-muted">
                    {t('sales.form.maxAvailable', { kg: formatKg(lot.remainingKg) })}
                  </p>
                )
              }
            >
              <input
                id="sale-quantity"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.quantityText}
                onChange={(event) => setField('quantityText', event.target.value)}
                disabled={saving}
                className={fieldClass}
              />
            </Field>

            <Field
              htmlFor="sale-price"
              label={t('sales.form.price')}
              error={errors.priceText}
              hint={
                belowFloor && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-amber-800">
                    <TriangleAlert size={14} className="mt-px shrink-0" />
                    {t('sales.form.belowFloorLive', { floor: formatMoney(floorPrice) })}
                  </p>
                )
              }
            >
              <input
                id="sale-price"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.priceText}
                onChange={(event) => setField('priceText', event.target.value)}
                disabled={saving}
                className={fieldClass}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-background p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('sales.form.total')}</p>
              <p className="text-2xl font-semibold text-text">
                {previewTotal === null ? t('sales.summary.noValue') : formatMoney(previewTotal)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="min-h-12 rounded-lg border border-text/10 bg-surface px-4 text-sm font-medium text-text hover:bg-background"
              >
                {t('sales.form.clear')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? t('sales.form.saving') : t('sales.form.save')}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  )
}
