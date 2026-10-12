import { useTranslation } from 'react-i18next'
import { Plus, Trash2, TriangleAlert } from 'lucide-react'
import { formatKg, formatMoney } from '../../utils/format'

const inputClass =
  'min-h-11 w-full rounded-lg border border-transparent bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-70'

// lines: [{ key, lotId, kgText, priceText }], already checked by the form (line.check).
export default function SaleOrderLines({ lines, lots, defaultPrice, floorPrice, disabled, onChange, onRemove, onAdd }) {
  const { t } = useTranslation()
  const usedLotIds = lines.map((line) => line.lotId)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs text-muted">
            <tr>
              <th className="px-2 py-2 font-semibold">{t('sales.form.lot')}</th>
              <th className="px-2 py-2 text-right font-semibold">{t('sales.form.available')}</th>
              <th className="px-2 py-2 font-semibold">{t('sales.form.kg')}</th>
              <th className="px-2 py-2 font-semibold">{t('sales.form.linePrice')}</th>
              <th className="px-2 py-2 text-right font-semibold">{t('sales.form.amount')}</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {lines.map((line) => {
              const lot = lots.find((candidate) => String(candidate.id) === line.lotId)
              const { errors, kg, price } = line.check
              const belowFloor = Boolean(floorPrice) && price > 0 && price < floorPrice
              return (
                <tr key={line.key} className="align-top">
                  <td className="min-w-48 px-2 py-2">
                    <select
                      aria-label={t('sales.form.lot')}
                      value={line.lotId}
                      onChange={(event) => onChange(line.key, { lotId: event.target.value })}
                      disabled={disabled}
                      className={inputClass}
                    >
                      <option value="">{t('sales.form.chooseLot')}</option>
                      {lots
                        .filter((candidate) => String(candidate.id) === line.lotId || !usedLotIds.includes(String(candidate.id)))
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {t('sales.form.lotOption', { code: candidate.code, kg: formatKg(candidate.remainingKg) })}
                          </option>
                        ))}
                    </select>
                    {errors.lot && <p className="mt-1 text-xs text-danger">{errors.lot}</p>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-right text-muted">
                    {lot ? formatKg(lot.remainingKg) : '–'}
                  </td>
                  <td className="min-w-28 px-2 py-2">
                    <input
                      aria-label={t('sales.form.kg')}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={line.kgText}
                      onChange={(event) => onChange(line.key, { kgText: event.target.value })}
                      disabled={disabled}
                      className={inputClass}
                    />
                    {errors.kg && <p className="mt-1 text-xs text-danger">{errors.kg}</p>}
                  </td>
                  <td className="min-w-28 px-2 py-2">
                    <input
                      aria-label={t('sales.form.linePrice')}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={line.priceText}
                      placeholder={defaultPrice ? String(defaultPrice) : ''}
                      onChange={(event) => onChange(line.key, { priceText: event.target.value })}
                      disabled={disabled}
                      className={inputClass}
                    />
                    {errors.price && <p className="mt-1 text-xs text-danger">{errors.price}</p>}
                    {!errors.price && belowFloor && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-amber-800">
                        <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                        {t('sales.form.belowFloor', { floor: formatMoney(floorPrice) })}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-right font-medium">
                    {kg > 0 && price > 0 ? formatMoney(Math.round(kg * price)) : '–'}
                  </td>
                  <td className="px-1 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(line.key)}
                      disabled={disabled}
                      aria-label={t('sales.form.remove', { code: lot?.code ?? '' })}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || usedLotIds.length >= lots.length}
        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-dashed border-text/20 px-4 text-sm font-medium text-primary hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={16} />
        {t('sales.form.addLot')}
      </button>
    </div>
  )
}
