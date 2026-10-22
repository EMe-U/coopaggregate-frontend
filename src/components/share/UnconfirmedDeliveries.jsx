import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatKg } from '../../utils/format'
import ConfirmationBadge from '../deliveries/ConfirmationBadge'

// Shown when sharing was refused because some deliveries are not confirmed. deliveries comes from
// the 409 answer: { id, receiptCode, memberId, memberName, memberNumber, quantityKg, status }.
// Each one links to its delivery page, where it can be confirmed, checked or settled.
export default function UnconfirmedDeliveries({ deliveries }) {
  const { t } = useTranslation()
  if (!deliveries?.length) return null

  return (
    <div className="mt-3 rounded-lg border border-danger/20 p-3 text-sm">
      <p className="font-semibold text-text">{t('share.unconfirmed.title')}</p>
      <ul className="mt-2 divide-y divide-text/5">
        {deliveries.map((delivery) => (
          <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            <span>
              <Link to={`/deliveries/${delivery.id}`} className="font-mono text-primary hover:underline">
                {delivery.receiptCode}
              </Link>{' '}
              ·{' '}
              <Link to={`/members/${delivery.memberId}`} className="text-primary hover:underline">
                {delivery.memberName}
              </Link>{' '}
              · {formatKg(delivery.quantityKg)}
            </span>
            <ConfirmationBadge delivery={{ confirmationStatus: delivery.status }} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{t('share.unconfirmed.hint')}</p>
    </div>
  )
}
