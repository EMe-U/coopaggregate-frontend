import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import GradeName from '../GradeName'
import { formatDay, formatKg } from '../../utils/format'
import DisputeActionsMenu from './DisputeActionsMenu'

const noValue = '–'

const OUTCOME_CLASS = {
  RESOLVED: 'bg-primary-light text-primary',
  REVERSED: 'bg-danger/10 text-danger',
  CORRECTED: 'bg-warning/15 text-amber-800',
}

// How a settled dispute ended; a correction links to the delivery that replaced this one.
function Outcome({ dispute }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${OUTCOME_CLASS[dispute.outcome] ?? ''}`}>
        {t(`disputes.outcome.${dispute.outcome}`, { defaultValue: dispute.outcome })}
      </span>
      {dispute.correctedById && (
        <Link to={`/deliveries/${dispute.correctedById}`} className="text-xs text-primary hover:underline">
          {t('disputes.replacement')}
        </Link>
      )}
    </span>
  )
}

function reasonLabel(t, reason) {
  return reason ? t(`confirmation.disputeReason.${reason}`, { defaultValue: reason }) : noValue
}

// settled adds the outcome, settled date and the manager's note; only open disputes have a menu.
// The table has many columns, so cards are shown up to large screens, not only on phones.
export default function DisputeList({ disputes, settled, onChanged }) {
  const { t } = useTranslation()
  const cell = 'whitespace-nowrap px-3 py-3'
  const textCell = 'min-w-40 max-w-60 px-3 py-3 wrap-break-word text-muted'
  const columns = ['receipt', 'member', 'grade', 'lot', 'quantity', 'reason', 'note', 'daysOpen']
  if (settled) columns.push('outcome', 'settledAt', 'resolution')
  else columns.push('actions')

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold">
                  {t(`disputes.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {disputes.map((dispute) => (
              <tr key={dispute.deliveryId} className="align-top">
                <td className={cell}>
                  <Link to={`/deliveries/${dispute.deliveryId}`} className="font-mono font-semibold text-primary hover:underline">
                    {dispute.receiptCode}
                  </Link>
                </td>
                <td className={cell}>
                  <Link to={`/members/${dispute.memberId}`} className="font-medium text-text hover:text-primary hover:underline">
                    {dispute.memberName}
                  </Link>
                  <p className="text-xs text-muted">{dispute.memberNumber}</p>
                </td>
                <td className={cell}>
                  <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                    <GradeName name={dispute.gradeName} />
                  </span>
                </td>
                <td className={`${cell} font-mono text-xs`}>{dispute.lotCode}</td>
                <td className={`${cell} font-semibold`}>{formatKg(dispute.quantityKg)}</td>
                <td className={cell}>{reasonLabel(t, dispute.reason)}</td>
                <td className={textCell}>{dispute.note || noValue}</td>
                <td className={cell}>{t('disputes.days', { count: dispute.daysOpen })}</td>
                {settled ? (
                  <>
                    <td className={cell}>
                      <Outcome dispute={dispute} />
                    </td>
                    <td className={`${cell} text-muted`}>{formatDay(dispute.settledAt) || noValue}</td>
                    <td className={textCell}>{dispute.resolutionNote || noValue}</td>
                  </>
                ) : (
                  <td className="px-3 py-2">
                    <DisputeActionsMenu dispute={dispute} onChanged={onChanged} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-text/5 lg:hidden">
        {disputes.map((dispute) => (
          <li key={dispute.deliveryId} className="space-y-2 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`/deliveries/${dispute.deliveryId}`} className="font-mono font-semibold text-primary hover:underline">
                  {dispute.receiptCode}
                </Link>
                <p>
                  <Link to={`/members/${dispute.memberId}`} className="font-medium text-text hover:text-primary hover:underline">
                    {dispute.memberName}
                  </Link>
                  <span className="text-xs text-muted"> · {dispute.memberNumber}</span>
                </p>
              </div>
              {settled ? (
                <Outcome dispute={dispute} />
              ) : (
                <DisputeActionsMenu dispute={dispute} onChanged={onChanged} />
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
              <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                <GradeName name={dispute.gradeName} />
              </span>
              <span className="font-mono text-xs">{dispute.lotCode}</span>
              <span className="font-semibold text-text">{formatKg(dispute.quantityKg)}</span>
            </p>
            <div>
              <p className="font-medium text-text">{reasonLabel(t, dispute.reason)}</p>
              {dispute.note && <p className="wrap-break-word text-muted">{dispute.note}</p>}
            </div>
            <p className="text-xs text-muted">
              {t('disputes.days', { count: dispute.daysOpen })}
              {settled && dispute.settledAt && ` · ${t('disputes.settledOn', { date: formatDay(dispute.settledAt) })}`}
            </p>
            {settled && dispute.resolutionNote && (
              <p className="wrap-break-word rounded-lg bg-background p-2 text-muted">{dispute.resolutionNote}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
