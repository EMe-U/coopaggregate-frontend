import { useTranslation } from 'react-i18next'
import { Eye, HandCoins, TriangleAlert } from 'lucide-react'
import ActionsMenu from '../ActionsMenu'
import useNeedsInternet from '../../hooks/useNeedsInternet'

// Lots that still hold potatoes: being filled, full, and older open or closed lots.
export const LOT_HOLDS_STOCK = ['FILLING', 'FULL', 'OPEN', 'CLOSED']

// The only place for lot actions. "View details" comes first, then what the lot's status allows.
// The system fills lots by itself, so there is nothing to open or close. Sales are by grade, so
// "Record sale" opens a sale of the lot's grade. The loss needs a handler from the page.
function actionsFor(lot, { onRecordLoss }) {
  const hasStock = Number(lot.remainingKg) > 0
  const actions = [{ key: 'view', icon: Eye, path: `/lots/${lot.id}` }]

  if (LOT_HOLDS_STOCK.includes(lot.status) && hasStock) {
    actions.push({ key: 'recordSale', icon: HandCoins, path: `/sales?grade=${encodeURIComponent(lot.gradeName)}` })
    if (onRecordLoss) actions.push({ key: 'recordLoss', icon: TriangleAlert, run: () => onRecordLoss(lot), danger: true })
  }
  return actions
}

export default function LotActionsMenu({ lot, onRecordLoss }) {
  const { t } = useTranslation()
  const { offline, title } = useNeedsInternet()
  // Everything except viewing the lot changes data or opens a page that does.
  const actions = actionsFor(lot, { onRecordLoss }).map((action) => ({
    ...action,
    label: t(`lots.actions.${action.key}`),
    ...(offline && action.key !== 'view' && { disabled: true, title }),
  }))

  return <ActionsMenu label={t('lots.actions.menu', { code: lot.code })} actions={actions} />
}
