import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatKg } from '../../utils/format'

function LotCode({ lot }) {
  if (lot.lotId == null) return <span className="font-mono">{lot.lotCode}</span>
  return (
    <Link to={`/lots/${lot.lotId}`} className="font-mono text-primary hover:underline">
      {lot.lotCode}
    </Link>
  )
}

// The lots of one delivery in a single line, so a delivery spread over many lots keeps its row
// short. lots: [{ lotId?, lotCode, kg? }]. One lot shows its code (and kg when withKg); two show both
// codes; three or more show a "10 lots" button that calls onShowAll to open the full list.
export default function LotsCell({ lots, onShowAll, withKg = false }) {
  const { t } = useTranslation()

  if (lots.length === 1) {
    const [lot] = lots
    return (
      <span className="whitespace-nowrap">
        <LotCode lot={lot} />
        {withKg && lot.kg != null && <span className="text-muted"> · {formatKg(lot.kg)}</span>}
      </span>
    )
  }

  if (lots.length === 2) {
    return (
      <span className="whitespace-nowrap">
        {lots.map((lot, index) => (
          <Fragment key={lot.lotId ?? lot.lotCode}>
            {index > 0 && <span className="text-muted"> · </span>}
            <LotCode lot={lot} />
          </Fragment>
        ))}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onShowAll}
      aria-label={t('lots.cell.showAll', { count: lots.length })}
      title={lots.map((lot) => lot.lotCode).join(', ')}
      className="inline-flex items-center whitespace-nowrap rounded-full bg-primary-light px-2 font-sans text-xs font-medium leading-5 text-primary ring-1 ring-primary/20 hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {t('lots.cell.count', { count: lots.length })}
    </button>
  )
}

// The full list for a detail view: one row per lot, with the kg of this delivery in it when the
// data has them.
export function LotsBreakdown({ lots }) {
  const { t } = useTranslation()
  const withKg = lots.every((lot) => lot.kg != null)
  return (
    <table className="w-full max-w-xs text-left text-xs">
      <thead className="text-muted">
        <tr>
          <th className="py-1 pr-3 font-semibold">{t('lots.cell.lot')}</th>
          {withKg && <th className="py-1 text-right font-semibold">{t('lots.cell.kg')}</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-text/5">
        {lots.map((lot) => (
          <tr key={lot.lotId ?? lot.lotCode}>
            <td className="py-1 pr-3">
              <LotCode lot={lot} />
            </td>
            {withKg && <td className="whitespace-nowrap py-1 text-right">{formatKg(lot.kg)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
