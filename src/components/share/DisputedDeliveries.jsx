import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listDeliveries } from '../../api/deliveries'
import { formatKg } from '../../utils/format'

const PAGE_SIZE = 100

// The server only names the disputed receipts in its message, so the lot's deliveries are read to
// show each one with its member. A lot holds few deliveries, so this is a handful of requests.
async function loadDisputed(lotId) {
  const disputed = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listDeliveries({ lotId, page, size: PAGE_SIZE })
    disputed.push(...data.content.filter((delivery) => delivery.confirmationStatus === 'DISPUTED'))
    totalPages = data.totalPages
    page++
  }
  return disputed
}

// Shown when sharing was refused because of disputes: each disputed delivery links to its member
// and to the lot, where it can be settled, corrected or reversed.
export default function DisputedDeliveries({ lotId }) {
  const { t } = useTranslation()
  const [deliveries, setDeliveries] = useState(null)

  useEffect(() => {
    let ignore = false
    loadDisputed(lotId)
      .then((list) => {
        if (!ignore) setDeliveries(list)
      })
      // The server's message already names the receipts; the list is extra help.
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [lotId])

  if (!deliveries || deliveries.length === 0) return null

  return (
    <div className="mt-3 rounded-lg border border-danger/20 p-3 text-sm">
      <p className="font-semibold text-text">{t('share.disputes.title')}</p>
      <ul className="mt-2 divide-y divide-text/5">
        {deliveries.map((delivery) => (
          <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            <span>
              <Link to={`/lots/${lotId}`} className="font-mono text-primary hover:underline">
                {delivery.receiptCode}
              </Link>{' '}
              ·{' '}
              <Link to={`/members/${delivery.memberId}`} className="text-primary hover:underline">
                {delivery.memberName}
              </Link>{' '}
              · {formatKg(delivery.quantityKg)}
            </span>
            <span className="text-xs text-danger">
              {t(`confirmation.disputeReason.${delivery.disputeReason}`, { defaultValue: delivery.disputeReason })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{t('share.disputes.hint')}</p>
    </div>
  )
}
