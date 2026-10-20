import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, HandCoins, Save, Sparkles, TriangleAlert } from 'lucide-react'
import { listGrades } from '../../api/grades'
import { listAllLots } from '../../api/lots'
import { recordSaleOrder } from '../../api/sales'
import { formatKg, formatMoney, kigaliIsoDate } from '../../utils/format'
import { parseKg } from '../../utils/quantity'
import BuyerPicker from './BuyerPicker'
import SaleOrderLines from './SaleOrderLines'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import useGradeName from '../../hooks/useGradeName'

const PRICE_PATTERN = /^\d+$/

const fieldClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-70'

function parsePrice(text) {
  return PRICE_PATTERN.test(text.trim()) && Number(text.trim()) > 0 ? Number(text.trim()) : null
}

// Kilograms are rounded to 2 decimals so 0.1 + 0.2 kg compares as 0.3.
function roundKg(kg) {
  return Math.round(kg * 100) / 100
}

let nextLineKey = 1
function newLine(lotId = '') {
  return { key: nextLineKey++, lotId: String(lotId), kgText: '', priceText: '' }
}

// Oldest lots first (by the day they opened, then by id), so older potatoes are sold before newer ones.
function oldestFirst(a, b) {
  return a.createdAt.localeCompare(b.createdAt) || a.id - b.id
}

// Takes kg from the oldest lots until the wanted kg is reached. Returns the lines and the kg still
// missing when the lots do not hold enough.
function suggestLines(lots, wantedKg) {
  const lines = []
  let missing = wantedKg
  for (const lot of [...lots].sort(oldestFirst)) {
    if (missing <= 0) break
    const take = roundKg(Math.min(Number(lot.remainingKg), missing))
    lines.push({ ...newLine(lot.id), kgText: String(take) })
    missing = roundKg(missing - take)
  }
  return { lines, missing }
}

function emptyForm() {
  return { buyer: null, gradeId: '', priceText: '', wantedText: '', date: kigaliIsoDate(), lines: [] }
}

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

// The order answer holds its sales; a sale whose lot is now SOLD used up the last of that lot.
function lotsReadyToShare(sales) {
  const lots = new Map()
  for (const sale of sales) {
    if (sale.lotStatus === 'SOLD') lots.set(sale.lotId, { lotId: sale.lotId, lotCode: sale.lotCode })
  }
  return [...lots.values()]
}

function OrderResult({ order, onRecordAnother }) {
  const { t } = useTranslation()
  const readyToShare = lotsReadyToShare(order.sales)
  const belowFloor = order.sales.some((sale) => sale.belowFloor)

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg bg-primary-light p-4 text-primary">
        <CircleCheck size={22} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{t('sales.result.title', { code: order.orderCode })}</p>
          <p className="text-2xl font-semibold">{t('sales.result.total', { amount: formatMoney(order.totalAmountRwf) })}</p>
          <p className="text-sm">
            {order.buyer.name} · {formatKg(order.totalKg)}
          </p>
        </div>
      </div>
      {belowFloor && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          {t('sales.result.belowFloor')}
        </p>
      )}
      {readyToShare.length > 0 && (
        <div className="rounded-lg bg-background p-3 text-sm">
          <p className="font-medium text-text">{t('sales.result.readyToShare')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {readyToShare.map((lot) => (
              <li key={lot.lotId}>
                <Link
                  to={`/share?lotId=${lot.lotId}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 bg-surface px-3 font-medium text-primary hover:bg-primary-light"
                >
                  <span className="font-mono">{lot.lotCode}</span>
                  <span className="text-xs">{t('sales.result.share')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={onRecordAnother}
        className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
      >
        <HandCoins size={16} />
        {t('sales.result.recordAnother')}
      </button>
    </div>
  )
}

export default function SaleForm({ initialLotId, onSaved }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const needsInternet = useNeedsInternet()
  const today = kigaliIsoDate()

  const [lots, setLots] = useState(null)
  const [lotsError, setLotsError] = useState(false)
  const [lotsReloadKey, setLotsReloadKey] = useState(0)
  const [grades, setGrades] = useState([])

  const [form, setForm] = useState(emptyForm)
  // Created once per order and reused on every retry, so a double tap or a retry after a lost
  // response returns the order that was already saved instead of selling the potatoes twice.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedOrder, setSavedOrder] = useState(null)
  const [shortBy, setShortBy] = useState(0)
  const initialLotUsed = useRef(false)

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
    listGrades()
      .then(setGrades)
      .catch(() => setGrades([]))
  }, [])

  // Coming from a lot's "Record sale": start the order with that lot and its grade.
  useEffect(() => {
    if (initialLotUsed.current || !initialLotId || !lots || grades.length === 0) return
    initialLotUsed.current = true
    const lot = lots.find((candidate) => String(candidate.id) === String(initialLotId))
    const grade = lot && grades.find((candidate) => candidate.name === lot.gradeName)
    if (grade) setForm((current) => ({ ...current, gradeId: String(grade.id), lines: [newLine(lot.id)] }))
  }, [initialLotId, lots, grades])

  const grade = grades.find((candidate) => String(candidate.id) === form.gradeId)
  const gradeLots = (lots ?? []).filter((lot) => lot.gradeName === grade?.name)
  const mainPrice = parsePrice(form.priceText)
  const wantedKg = parseKg(form.wantedText)

  // Checks every line once; the table shows the messages and the form uses the numbers.
  const lines = form.lines.map((line) => {
    const lot = gradeLots.find((candidate) => String(candidate.id) === line.lotId)
    const kg = parseKg(line.kgText)
    const price = line.priceText.trim() ? parsePrice(line.priceText) : mainPrice
    const errors = {}
    if (!lot) errors.lot = t('sales.form.errors.lineLot')
    if (line.kgText.trim() !== '' && (kg === null || kg <= 0)) errors.kg = t('sales.form.errors.lineKg')
    else if (lot && kg > Number(lot.remainingKg)) {
      errors.kg = t('sales.form.errors.lineKgTooLarge', { kg: formatKg(lot.remainingKg) })
    }
    if (line.priceText.trim() !== '' && !price) errors.price = t('sales.form.errors.linePrice')
    const valid = Boolean(lot) && kg > 0 && Object.keys(errors).length === 0 && Boolean(price)
    return { ...line, check: { errors: line.lotId || line.kgText ? errors : {}, kg, price, valid } }
  })

  const totalKg = roundKg(lines.reduce((sum, line) => sum + (line.check.kg > 0 ? line.check.kg : 0), 0))
  // Preview only; the saved total comes from the backend.
  const totalAmount = lines.reduce(
    (sum, line) => sum + (line.check.kg > 0 && line.check.price ? Math.round(line.check.kg * line.check.price) : 0),
    0,
  )
  const fieldErrors = {
    priceText: form.priceText.trim() !== '' && !mainPrice ? t('sales.form.errors.priceInvalid') : '',
    wantedText: form.wantedText.trim() !== '' && !(wantedKg > 0) ? t('sales.form.errors.wantedInvalid') : '',
    date: form.date > today ? t('sales.form.errors.dateFuture') : '',
  }
  const canSave =
    Boolean(form.buyer) &&
    Boolean(grade) &&
    Boolean(form.date) &&
    !fieldErrors.priceText &&
    !fieldErrors.date &&
    lines.length > 0 &&
    lines.every((line) => line.check.valid)

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function changeGrade(gradeId) {
    // Lots belong to one grade, so lines from the old grade no longer fit.
    setForm((current) => ({ ...current, gradeId, lines: [] }))
    setShortBy(0)
  }

  function handleSuggest() {
    const suggestion = suggestLines(gradeLots, wantedKg)
    setForm((current) => ({ ...current, lines: suggestion.lines }))
    setShortBy(suggestion.missing)
  }

  function changeLine(key, changes) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    }))
  }

  function removeLine(key) {
    setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }))
  }

  function addLine() {
    setForm((current) => ({ ...current, lines: [...current.lines, newLine()] }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSave || saving || savedOrder) return
    setFormError('')

    setSaving(true)
    try {
      const order = await recordSaleOrder({
        clientUuid,
        buyerId: form.buyer.id,
        soldAt: form.date,
        items: lines.map((line) => ({
          lotId: Number(line.lotId),
          quantityKg: line.check.kg,
          pricePerKg: line.check.price,
        })),
      })
      setSavedOrder(order)
      onSaved?.(order)
    } catch (error) {
      if (!error.response) setFormError(t('sales.form.errors.serverUnreachable'))
      else setFormError(error.response.data?.message || t('sales.form.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm(emptyForm())
    setShortBy(0)
    setFormError('')
    setSavedOrder(null)
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

      {savedOrder ? (
        <OrderResult order={savedOrder} onRecordAnother={handleRecordAnother} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {formError && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Field htmlFor="buyer-search" label={t('sales.form.buyer')}>
              <BuyerPicker buyer={form.buyer} onChange={(buyer) => setField('buyer', buyer)} disabled={saving} />
            </Field>
            <Field htmlFor="sale-grade" label={t('sales.form.grade')}>
              <select
                id="sale-grade"
                value={form.gradeId}
                onChange={(event) => changeGrade(event.target.value)}
                disabled={saving || grades.length === 0}
                className={fieldClass}
              >
                <option value="">{t('sales.form.chooseGrade')}</option>
                {grades.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {gradeName(candidate.name)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Field htmlFor="sale-price" label={t('sales.form.price')} error={fieldErrors.priceText}>
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
            <Field htmlFor="sale-wanted" label={t('sales.form.wanted')} error={fieldErrors.wantedText}>
              <input
                id="sale-wanted"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.wantedText}
                onChange={(event) => setField('wantedText', event.target.value)}
                disabled={saving}
                className={fieldClass}
              />
            </Field>
            <Field htmlFor="sale-date" label={t('sales.form.date')} error={fieldErrors.date}>
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
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text">{t('sales.form.linesTitle')}</h3>
              {grade && gradeLots.length > 0 && (
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={saving || !(wantedKg > 0)}
                  title={t('sales.form.suggestHint')}
                  className="flex min-h-11 items-center gap-1.5 rounded-lg bg-primary-light px-4 text-sm font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  {t('sales.form.suggest')}
                </button>
              )}
            </div>
            {grade && gradeLots.length > 0 && (
              <p className="text-xs text-muted">{t('sales.form.suggestHint')}</p>
            )}
            {shortBy > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                {t('sales.form.notEnoughStock', {
                  available: formatKg(roundKg(gradeLots.reduce((sum, lot) => sum + Number(lot.remainingKg), 0))),
                })}
              </p>
            )}
            {lotsError && <p className="text-sm text-danger">{t('lots.table.error')}</p>}
            {!grade && <p className="rounded-lg bg-background p-4 text-sm text-muted">{t('sales.form.noLines')}</p>}
            {grade && lots && gradeLots.length === 0 && (
              <p className="rounded-lg bg-background p-4 text-sm text-muted">{t('sales.form.noLots')}</p>
            )}
            {grade && gradeLots.length > 0 && (
              <SaleOrderLines
                lines={lines}
                lots={gradeLots}
                defaultPrice={mainPrice}
                floorPrice={grade.floorPricePerKg}
                disabled={saving}
                onChange={changeLine}
                onRemove={removeLine}
                onAdd={addLine}
              />
            )}
          </div>

          <div className="space-y-3 rounded-lg bg-background p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('sales.form.totalKg')}</p>
                  <p className="text-xl font-semibold text-text">{formatKg(totalKg)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('sales.form.totalAmount')}</p>
                  <p className="text-xl font-semibold text-text">{formatMoney(totalAmount)}</p>
                </div>
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
                  disabled={!canSave || saving || needsInternet.offline}
                  title={needsInternet.title}
                  className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? t('sales.form.saving') : t('sales.form.save')}
                </button>
              </div>
            </div>
            {wantedKg > 0 && lines.length > 0 && roundKg(wantedKg) !== totalKg && (
              <p className="flex items-start gap-2 text-sm text-amber-800">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                {t('sales.form.mismatch', { taken: formatKg(totalKg), wanted: formatKg(wantedKg) })}
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
