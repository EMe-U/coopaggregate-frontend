import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Eye, HandCoins, RefreshCw, Save } from 'lucide-react'
import { listGrades } from '../../api/grades'
import { previewSale, recordSale, recordSaleOrder } from '../../api/sales'
import { formatDate, formatMoney, kigaliIsoDate } from '../../utils/format'
import { parseKg } from '../../utils/quantity'
import BuyerPicker from './BuyerPicker'
import SaleOrderLines from './SaleOrderLines'
import SalePreview, { skipReasonError } from './SalePreview'
import SaleResult from './SaleResult'
import useNeedsInternet from '../../hooks/useNeedsInternet'

const PRICE_PATTERN = /^\d+$/

const fieldClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-70'

function parsePrice(text) {
  return PRICE_PATTERN.test(text.trim()) && Number(text.trim()) > 0 ? Number(text.trim()) : null
}

let nextItemKey = 1
function newItem(gradeId = '') {
  return { key: nextItemKey++, gradeId: String(gradeId), kgText: '', priceText: '' }
}

function emptyForm() {
  return { buyer: null, date: kigaliIsoDate(), items: [newItem()] }
}

const noSkip = { ids: [], reason: '' }

function Field({ htmlFor, label, error, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

function requestMessage(t, error) {
  if (!error.response) return t('sales.form.errors.serverUnreachable')
  return error.response.data?.message || t('sales.form.errors.generic')
}

// The skip list and reason go with an item only when it skips something.
function withSkip(body, skip) {
  if (skip.ids.length === 0) return body
  return { ...body, skipDeliveryIds: skip.ids, skipReason: skip.reason.trim() }
}

// One grade is one sale (POST /api/sales); several grades are one order (POST /api/sales/orders).
// Steps: edit, then preview (the batches each grade would use, from the backend), then the saved
// result with the batches really used. A sale always needs the server; nothing is queued offline.
export default function SaleForm({ initialGradeName, onSaved }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const today = kigaliIsoDate()

  const [grades, setGrades] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [tried, setTried] = useState(false)
  const [step, setStep] = useState('edit')
  // By item key: { status, data, message } and { ids, reason }.
  const [previews, setPreviews] = useState({})
  const [skips, setSkips] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  // The clientUuid belongs to one attempt: the same request sent again keeps it, so a retry after
  // a lost answer returns the sale already saved; any change makes a new attempt with a new one.
  const attempt = useRef({ key: null, uuid: null })
  // Only the latest preview of each item is shown.
  const previewRequests = useRef({})
  const initialGradeUsed = useRef(false)

  useEffect(() => {
    listGrades()
      .then(setGrades)
      .catch(() => setGrades([]))
  }, [])

  // Coming from a lot's "Record sale": start with the lot's grade.
  useEffect(() => {
    if (initialGradeUsed.current || !initialGradeName || grades.length === 0) return
    initialGradeUsed.current = true
    const grade = grades.find((candidate) => candidate.name === initialGradeName)
    if (grade) setForm((current) => ({ ...current, items: [newItem(grade.id)] }))
  }, [initialGradeName, grades])

  const items = form.items.map((item) => {
    const grade = grades.find((candidate) => String(candidate.id) === item.gradeId)
    const kg = parseKg(item.kgText)
    const price = parsePrice(item.priceText)
    const errors = {}
    if (!grade && tried) errors.grade = t('sales.form.errors.gradeRequired')
    if (item.kgText.trim() === '') {
      if (tried) errors.kg = t('sales.form.errors.kgRequired')
    } else if (!(kg > 0)) errors.kg = t('sales.form.errors.kgInvalid')
    if (item.priceText.trim() === '') {
      if (tried) errors.price = t('sales.form.errors.priceRequired')
    } else if (!price) errors.price = t('sales.form.errors.priceInvalid')
    return { ...item, grade, check: { errors, kg, price, valid: Boolean(grade) && kg > 0 && Boolean(price) } }
  })

  const fieldErrors = {
    buyer: tried && !form.buyer ? t('sales.form.errors.buyerRequired') : '',
    date: !form.date ? (tried ? t('sales.form.errors.dateRequired') : '') : form.date > today ? t('sales.form.errors.dateFuture') : '',
  }
  const formValid = Boolean(form.buyer) && Boolean(form.date) && form.date <= today && items.every((item) => item.check.valid)
  // Display only; the amounts that count come from the backend.
  const estimate = items.reduce((sum, item) => sum + (item.check.kg > 0 && item.check.price ? Math.round(item.check.kg * item.check.price) : 0), 0)

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function changeItem(key, changes) {
    // Another grade has other batches, so its skipped batches no longer apply.
    if ('gradeId' in changes) setSkips((current) => ({ ...current, [key]: noSkip }))
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    }))
  }

  function removeItem(key) {
    setForm((current) => ({ ...current, items: current.items.filter((item) => item.key !== key) }))
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, newItem()] }))
  }

  function loadPreview(item, skipIds) {
    const request = (previewRequests.current[item.key] ?? 0) + 1
    previewRequests.current[item.key] = request
    setPreviews((current) => ({ ...current, [item.key]: { status: 'loading' } }))
    previewSale(item.gradeId, { quantityKg: item.check.kg, pricePerKg: item.check.price, skip: skipIds })
      .then((data) => {
        if (previewRequests.current[item.key] === request) {
          setPreviews((current) => ({ ...current, [item.key]: { status: 'done', data } }))
        }
      })
      .catch((error) => {
        if (previewRequests.current[item.key] === request) {
          setPreviews((current) => ({ ...current, [item.key]: { status: 'error', message: requestMessage(t, error) } }))
        }
      })
  }

  function loadAllPreviews() {
    for (const item of items) loadPreview(item, (skips[item.key] ?? noSkip).ids)
  }

  function handlePreview(event) {
    event.preventDefault()
    setTried(true)
    if (!formValid) return
    setFormError('')
    setStep('preview')
    loadAllPreviews()
  }

  function changeSkip(item, ids) {
    setSkips((current) => ({ ...current, [item.key]: { ...(current[item.key] ?? noSkip), ids } }))
    loadPreview(item, ids)
  }

  const skipOf = (item) => skips[item.key] ?? noSkip
  const allPreviewed = items.every((item) => previews[item.key]?.status === 'done' && previews[item.key].data.enough)
  const reasonsValid = items.every((item) => !skipReasonError(t, skipOf(item)))
  const canSave = step === 'preview' && allPreviewed && reasonsValid && !saving && !needsInternet.offline
  const previewTotal = items.reduce((sum, item) => sum + (previews[item.key]?.data?.totalAmountRwf ?? 0), 0)

  async function handleSave() {
    if (!canSave) return
    setFormError('')

    const single = items.length === 1
    const lines = items.map((item) =>
      withSkip({ gradeId: Number(item.gradeId), quantityKg: item.check.kg, pricePerKg: item.check.price }, skipOf(item)),
    )
    const body = single
      ? { ...lines[0], buyerId: form.buyer.id, soldAt: form.date }
      : { buyerId: form.buyer.id, soldAt: form.date, items: lines }
    const key = JSON.stringify({ single, body })
    if (attempt.current.key !== key) attempt.current = { key, uuid: crypto.randomUUID() }

    setSaving(true)
    try {
      if (single) {
        const sale = await recordSale({ clientUuid: attempt.current.uuid, ...body })
        setResult({ code: sale.saleCode, buyerName: sale.buyerName, totalKg: sale.quantityKg, totalAmountRwf: sale.totalAmountRwf, sales: [sale] })
      } else {
        const order = await recordSaleOrder({ clientUuid: attempt.current.uuid, ...body })
        setResult({ code: order.orderCode, buyerName: order.buyer.name, totalKg: order.totalKg, totalAmountRwf: order.totalAmountRwf, sales: order.sales })
      }
      setStep('done')
      onSaved?.()
    } catch (error) {
      setFormError(requestMessage(t, error))
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm(emptyForm())
    setTried(false)
    setStep('edit')
    setPreviews({})
    setSkips({})
    setFormError('')
    setResult(null)
    attempt.current = { key: null, uuid: null }
  }

  const secondaryButton =
    'flex min-h-12 items-center gap-2 rounded-lg border border-text/10 bg-surface px-4 text-sm font-medium text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-50'
  const primaryButton =
    'flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <HandCoins size={20} className="text-primary" />
          {t('sales.form.title')}
        </h2>
        <p className="text-sm text-muted">{t('sales.form.subtitle')}</p>
      </div>

      {step === 'done' && result && <SaleResult result={result} onRecordAnother={reset} />}

      {step === 'edit' && (
        <form onSubmit={handlePreview} noValidate className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field htmlFor="buyer-search" label={t('sales.form.buyer')} error={fieldErrors.buyer}>
              <BuyerPicker buyer={form.buyer} onChange={(buyer) => setField('buyer', buyer)} />
            </Field>
            <Field htmlFor="sale-date" label={t('sales.form.date')} error={fieldErrors.date}>
              <input
                id="sale-date"
                type="date"
                value={form.date}
                max={today}
                onChange={(event) => setField('date', event.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text">{t('sales.form.linesTitle')}</h3>
            <p className="text-xs text-muted">{t('sales.form.linesHint')}</p>
            <SaleOrderLines items={items} grades={grades} onChange={changeItem} onRemove={removeItem} onAdd={addItem} />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg bg-background p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('sales.form.estimate')}</p>
              <p className="text-xl font-semibold text-text">{formatMoney(estimate)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={reset} className={secondaryButton}>
                {t('sales.form.clear')}
              </button>
              <button type="submit" disabled={needsInternet.offline} title={needsInternet.title} className={primaryButton}>
                <Eye size={16} />
                {t('sales.form.preview')}
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {t('sales.preview.intro', { buyer: form.buyer.name, date: formatDate(form.date) })}
          </p>
          {formError && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          {items.map((item) => (
            <SalePreview
              key={item.key}
              item={item}
              preview={previews[item.key]}
              skip={skipOf(item)}
              disabled={saving}
              onSkip={(id) => changeSkip(item, [...skipOf(item).ids, id])}
              onUnskip={(id) => changeSkip(item, skipOf(item).ids.filter((skipped) => skipped !== id))}
              onReasonChange={(reason) => setSkips((current) => ({ ...current, [item.key]: { ...skipOf(item), reason } }))}
            />
          ))}

          <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg bg-background p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('sales.form.totalAmount')}</p>
              <p className="text-xl font-semibold text-text">{formatMoney(previewTotal)}</p>
              <p className="text-xs text-muted">{t('sales.preview.mayChange')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStep('edit')} disabled={saving} className={secondaryButton}>
                <ArrowLeft size={16} />
                {t('sales.preview.back')}
              </button>
              <button type="button" onClick={loadAllPreviews} disabled={saving || needsInternet.offline} className={secondaryButton}>
                <RefreshCw size={16} />
                {t('sales.preview.checkAgain')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                title={needsInternet.title}
                className={primaryButton}
              >
                <Save size={16} />
                {saving ? t('sales.form.saving') : t('sales.form.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
