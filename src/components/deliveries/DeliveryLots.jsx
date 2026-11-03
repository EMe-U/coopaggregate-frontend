import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatKg } from '../../utils/format'
import LotsCell, { LotsBreakdown } from '../lots/LotsCell'

// The lots a delivery is in. A delivery is in no lot until it is confirmed; a reversed one that
// never was shows a dash. One lot shows its code and kg. In a list, more lots stay on one line
// (LotsCell): three or more become a button that opens the delivery's page (deliveryId). full is for
// that page and the receipt: every lot with its kg in a small table.
export default function DeliveryLots({ lots, reversed, deliveryId, full = false, className = '' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!lots || lots.length === 0) {
    if (reversed) return <span className="text-muted">–</span>
    return <span className="text-xs text-muted">{t('deliveries.lots.afterConfirmation')}</span>
  }

  if (lots.length > 1 && full) return <LotsBreakdown lots={lots} />

  if (lots.length > 1) {
    return (
      <span className={`block text-xs ${className}`}>
        <LotsCell lots={lots} onShowAll={() => navigate(`/deliveries/${deliveryId}`)} />
      </span>
    )
  }

  const [lot] = lots
  return (
    <ul className={`space-y-0.5 ${className}`}>
      <li className="whitespace-nowrap">
        <Link to={`/lots/${lot.lotId}`} className="font-mono text-xs text-primary hover:underline">
          {lot.lotCode}
        </Link>
        <span className="text-xs text-muted"> · {formatKg(lot.kg)}</span>
      </li>
    </ul>
  )
}
