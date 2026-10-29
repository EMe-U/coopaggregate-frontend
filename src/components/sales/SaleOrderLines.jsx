import { useTranslation } from 'react-i18next'
import { Plus, Trash2, TriangleAlert } from 'lucide-react'
import useGradeName from '../../hooks/useGradeName'
import { formatMoney } from '../../utils/format'

const inputClass =
  'min-h-11 w-full rounded-lg border border-transparent bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-70'

// One line per grade; each grade can be in the order once. items: [{ key, gradeId, kgText,
// priceText }], already checked by the form (item.check). One line is a sale, several an order.
export default function SaleOrderLines({ items, grades, disabled, onChange, onRemove, onAdd }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const usedGradeIds = items.map((item) => item.gradeId)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs text-muted">
            <tr>
              <th className="px-2 py-2 font-semibold">{t('sales.form.grade')}</th>
              <th className="px-2 py-2 font-semibold">{t('sales.form.kg')}</th>
              <th className="px-2 py-2 font-semibold">{t('sales.form.price')}</th>
              <th className="px-2 py-2 text-right font-semibold">{t('sales.form.amount')}</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {items.map((item) => {
              const grade = grades.find((candidate) => String(candidate.id) === item.gradeId)
              const { errors, kg, price } = item.check
              const floor = grade?.floorPricePerKg
              const belowFloor = Boolean(floor) && price > 0 && price < floor
              return (
                <tr key={item.key} className="align-top">
                  <td className="min-w-40 px-2 py-2">
                    <select
                      aria-label={t('sales.form.grade')}
                      value={item.gradeId}
                      onChange={(event) => onChange(item.key, { gradeId: event.target.value })}
                      disabled={disabled}
                      className={inputClass}
                    >
                      <option value="">{t('sales.form.chooseGrade')}</option>
                      {grades
                        .filter((candidate) => String(candidate.id) === item.gradeId || !usedGradeIds.includes(String(candidate.id)))
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {gradeName(candidate.name)}
                          </option>
                        ))}
                    </select>
                    {errors.grade && <p className="mt-1 text-xs text-danger">{errors.grade}</p>}
                  </td>
                  <td className="min-w-28 px-2 py-2">
                    <input
                      aria-label={t('sales.form.kg')}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={item.kgText}
                      onChange={(event) => onChange(item.key, { kgText: event.target.value })}
                      disabled={disabled}
                      className={inputClass}
                    />
                    {errors.kg && <p className="mt-1 text-xs text-danger">{errors.kg}</p>}
                  </td>
                  <td className="min-w-32 px-2 py-2">
                    <input
                      aria-label={t('sales.form.price')}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={item.priceText}
                      onChange={(event) => onChange(item.key, { priceText: event.target.value })}
                      disabled={disabled}
                      className={inputClass}
                    />
                    {errors.price && <p className="mt-1 text-xs text-danger">{errors.price}</p>}
                    {!errors.price && belowFloor && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-amber-800">
                        <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                        {t('sales.form.belowFloor', { floor: formatMoney(floor) })}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-right font-medium">
                    {kg > 0 && price > 0 ? formatMoney(Math.round(kg * price)) : '–'}
                  </td>
                  <td className="px-1 py-2 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemove(item.key)}
                        disabled={disabled}
                        aria-label={t('sales.form.remove', { grade: grade ? gradeName(grade.name) : '' })}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
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
        disabled={disabled || usedGradeIds.length >= grades.length}
        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-dashed border-text/20 px-4 text-sm font-medium text-primary hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={16} />
        {t('sales.form.addGrade')}
      </button>
    </div>
  )
}
