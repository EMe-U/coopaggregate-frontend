import { useTranslation } from 'react-i18next'
import { Eye, HandCoins, Lock, Split, TriangleAlert } from 'lucide-react'
import ActionsMenu from '../ActionsMenu'

// The only place for lot actions. "View details" comes first, then what the lot's status allows.
// Close and loss need a handler from the page.
function actionsFor(lot, { onClose, onRecordLoss }) {
  const hasStock = Number(lot.remainingKg) > 0
  const actions = [{ key: 'view', icon: Eye, path: `/lots/${lot.id}` }]

  if (lot.status === 'OPEN') {
    if (onClose) actions.push({ key: 'close', icon: Lock, run: () => onClose(lot) })
    if (onRecordLoss && hasStock) actions.push({ key: 'recordLoss', icon: TriangleAlert, run: () => onRecordLoss(lot), danger: true })
  }
  if (lot.status === 'CLOSED' && hasStock) {
    actions.push({ key: 'recordSale', icon: HandCoins, path: `/sales?lotId=${lot.id}` })
    if (onRecordLoss) actions.push({ key: 'recordLoss', icon: TriangleAlert, run: () => onRecordLoss(lot), danger: true })
  }
  if (lot.status === 'SOLD') actions.push({ key: 'shareMoney', icon: Split, path: `/share?lotId=${lot.id}` })
  if (lot.status === 'SHARED') actions.push({ key: 'viewShares', icon: Split, path: `/share?lotId=${lot.id}` })
  return actions
}

export default function LotActionsMenu({ lot, onClose, onRecordLoss }) {
  const { t } = useTranslation()
  const actions = actionsFor(lot, { onClose, onRecordLoss }).map((action) => ({
    ...action,
    label: t(`lots.actions.${action.key}`),
  }))

  return <ActionsMenu label={t('lots.actions.menu', { code: lot.code })} actions={actions} />
}
