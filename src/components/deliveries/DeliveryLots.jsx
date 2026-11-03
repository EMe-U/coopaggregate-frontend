import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatKg } from '../../utils/format'

// The lots a delivery is in, one line per lot with its kg there. A delivery is in no lot until it
// is confirmed; a reversed one that never was shows a dash.
export default function DeliveryLots({ lots, reversed, className = '' }) {
  const { t } = useTranslation()

  if (!lots || lots.length === 0) {
    if (reversed) return <span className="text-muted">–</span>
    return <span className="text-xs text-muted">{t('deliveries.lots.afterConfirmation')}</span>
  }

  return (
    <ul className={`space-y-0.5 ${className}`}>
      {lots.map((lot) => (
        <li key={lot.lotId} className="whitespace-nowrap">
          <Link to={`/lots/${lot.lotId}`} className="font-mono text-xs text-primary hover:underline">
            {lot.lotCode}
          </Link>
          <span className="text-xs text-muted"> · {formatKg(lot.kg)}</span>
        </li>
      ))}
    </ul>
  )
}
