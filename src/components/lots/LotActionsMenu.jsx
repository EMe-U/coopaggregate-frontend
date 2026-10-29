import { useTranslation } from 'react-i18next'
import { Eye, HandCoins, Lock, Split, TriangleAlert } from 'lucide-react'
import ActionsMenu from '../ActionsMenu'
import useNeedsInternet from '../../hooks/useNeedsInternet'

// The only place for lot actions. "View details" comes first, then what the lot's status allows.
// Close and loss need a handler from the page. Sales are by grade, so "Record sale" opens a sale of
// the lot's grade, from an open or a closed lot (closing is optional). A lot with sales is never
// shared: its members were paid by batch, and sharing it answers 409.
function actionsFor(lot, { onClose, onRecordLoss }) {
  const hasStock = Number(lot.remainingKg) > 0
  const actions = [{ key: 'view', icon: Eye, path: `/lots/${lot.id}` }]

  if (lot.status === 'OPEN' && onClose) actions.push({ key: 'close', icon: Lock, run: () => onClose(lot) })
  if ((lot.status === 'OPEN' || lot.status === 'CLOSED') && hasStock) {
    actions.push({ key: 'recordSale', icon: HandCoins, path: `/sales?grade=${encodeURIComponent(lot.gradeName)}` })
    if (onRecordLoss) actions.push({ key: 'recordLoss', icon: TriangleAlert, run: () => onRecordLoss(lot), danger: true })
  }
  if (lot.status === 'SOLD' && !(Number(lot.soldKg) > 0)) actions.push({ key: 'shareMoney', icon: Split, path: `/share?lotId=${lot.id}` })
  if (lot.status === 'SHARED') actions.push({ key: 'viewShares', icon: Split, path: `/share?lotId=${lot.id}` })
  return actions
}

export default function LotActionsMenu({ lot, onClose, onRecordLoss }) {
  const { t } = useTranslation()
  const { offline, title } = useNeedsInternet()
  // Everything except viewing the lot changes data or opens a page that does.
  const actions = actionsFor(lot, { onClose, onRecordLoss }).map((action) => ({
    ...action,
    label: t(`lots.actions.${action.key}`),
    ...(offline && action.key !== 'view' && { disabled: true, title }),
  }))

  return <ActionsMenu label={t('lots.actions.menu', { code: lot.code })} actions={actions} />
}
