import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleX, Clock, Eye } from 'lucide-react'
import { changeRequestStatus } from '../../api/buyerRequests'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatKg } from '../../utils/format'
import ActionsMenu from '../ActionsMenu'
import ReasonDialog from '../ReasonDialog'
import RequestDetailsDialog from './RequestDetailsDialog'

const CHANGES = [
  { status: 'ACCEPTED', icon: CircleCheck, tone: 'primary' },
  { status: 'REJECTED', icon: CircleX, tone: 'danger' },
  { status: 'PENDING', icon: Clock, tone: 'primary' },
]

// ⋮ menu for one request: see its details, or change its status with an optional message that the
// buyer reads when they look the request up. onChanged runs after a successful change.
export default function RequestActionsMenu({ request, onChanged }) {
  const { t } = useTranslation()
  const { offline, title } = useNeedsInternet()
  // Which dialog is open: details, or the status being set (ACCEPTED, REJECTED, PENDING).
  const [open, setOpen] = useState(null)

  const actions = [
    { key: 'view', icon: Eye, label: t('buyerRequests.actions.view'), run: () => setOpen('details') },
    ...CHANGES.filter((change) => change.status !== request.status).map(({ status, icon }) => ({
      key: status,
      icon,
      label: t(`buyerRequests.actions.${status}`),
      run: () => setOpen(status),
      danger: status === 'REJECTED',
      disabled: offline,
      title,
    })),
  ]
  const change = CHANGES.find((candidate) => candidate.status === open)

  return (
    <>
      <ActionsMenu label={t('buyerRequests.actions.menu', { code: request.code })} actions={actions} />
      {open === 'details' && <RequestDetailsDialog requestId={request.id} onClose={() => setOpen(null)} />}
      {change && (
        <ReasonDialog
          title={t(`buyerRequests.change.title.${change.status}`, { code: request.code })}
          summary={`${request.buyerName} · ${formatKg(request.quantityKg)}`}
          explanation={t('buyerRequests.change.explanation')}
          fieldLabel={t('buyerRequests.change.message')}
          placeholder={t('buyerRequests.change.placeholder')}
          confirmLabel={t(`buyerRequests.actions.${change.status}`)}
          tone={change.tone}
          optional
          onConfirm={async (publicMessage) => {
            const saved = await changeRequestStatus(request.id, { status: change.status, publicMessage })
            setOpen(null)
            onChanged(saved)
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
