import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDay, formatKg, formatMoney } from '../../utils/format'

const cell = 'whitespace-nowrap px-3 py-2'

// Consecutive lines of the same lot, in the order the sale takes them.
function groupByLot(batches) {
  const groups = []
  for (const batch of batches) {
    const last = groups.at(-1)
    if (last && last.lotId === batch.lotId) last.batches.push(batch)
    else groups.push({ lotId: batch.lotId, lotCode: batch.lotCode, batches: [batch] })
  }
  return groups
}

// The lines a sale uses (or would use), grouped by lot in the order the lots are taken; each line is
// one member's part of a lot, so a delivery split across two lots appears on two lines. kgField is
// takeKg in a preview and kg in a saved sale. withDelivered adds the delivery date (preview);
// withMoney adds gross and deduction before the net. A sale from before sales by grade has no money
// per batch: its members are paid through the lot share, which the last column says instead.
// renderLotAction adds a button to each lot's heading, for example the preview's "Skip lot".
// Lines without a lot (older sales) are listed without lot headings.
export default function SaleBatchesTable({ batches, kgField = 'kg', withDelivered, withMoney, paidByLotShare, renderLotAction }) {
  const { t } = useTranslation()
  const key = 'sales.batches'
  const grouped = batches.every((batch) => batch.lotId != null)
  const columns = ['member', 'receipt']
  if (!grouped) columns.push('lot')
  if (withDelivered) columns.push('delivered')
  columns.push('kg')
  if (paidByLotShare) columns.push('money')
  else {
    if (withMoney) columns.push('gross', 'deduction')
    columns.push('net')
  }
  const groups = grouped ? groupByLot(batches) : [{ lotId: null, batches }]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-background text-xs text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className={`whitespace-nowrap px-3 py-2 font-semibold ${['kg', 'gross', 'deduction', 'net'].includes(column) ? 'text-right' : ''}`}>
                {t(`${key}.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, index) => (
            <Fragment key={`${group.lotId}-${index}`}>
              {grouped && (
                <tr className="border-t border-text/10 bg-primary-light/40">
                  <td colSpan={columns.length} className="px-3 py-1.5">
                    {/* Pinned to the visible part of the table, so the heading and its action stay in view
                        when the table scrolls sideways on a phone. */}
                    <div className="sticky left-3 flex w-fit max-w-[calc(100vw-6rem)] flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-xs font-semibold text-text">
                        {t(`${key}.lotHeading`)}{' '}
                        <Link to={`/lots/${group.lotId}`} className="font-mono text-primary hover:underline">
                          {group.lotCode}
                        </Link>
                        <span className="font-normal text-muted">
                          {' · '}
                          {t(`${key}.lotKg`, {
                            kg: formatKg(Math.round(group.batches.reduce((sum, batch) => sum + Number(batch[kgField]), 0) * 100) / 100),
                            count: group.batches.length,
                          })}
                        </span>
                      </span>
                      {renderLotAction?.(group)}
                    </div>
                  </td>
                </tr>
              )}
              {group.batches.map((batch) => (
                <tr key={batch.lotPortionId ?? `${batch.lotId}-${batch.deliveryId}`} className="border-t border-text/5">
                  <td className={cell}>
                    <Link to={`/members/${batch.memberId}`} className="font-medium text-text hover:text-primary hover:underline">
                      {batch.memberName}
                    </Link>
                    <span className="block text-xs text-muted">{batch.memberNumber}</span>
                  </td>
                  <td className={`${cell} font-mono text-xs`}>
                    <Link to={`/deliveries/${batch.deliveryId}`} className="text-primary hover:underline">
                      {batch.receiptCode}
                    </Link>
                  </td>
                  {!grouped && <td className={`${cell} font-mono text-xs`}>{batch.lotCode ?? '–'}</td>}
                  {withDelivered && <td className={`${cell} text-muted`}>{formatDay(batch.deliveredAt)}</td>}
                  <td className={`${cell} text-right`}>{formatKg(batch[kgField])}</td>
                  {paidByLotShare ? (
                    <td className={`${cell} text-muted`}>{t(`${key}.paidByLotShare`)}</td>
                  ) : (
                    <>
                      {withMoney && <td className={`${cell} text-right`}>{formatMoney(batch.grossRwf)}</td>}
                      {withMoney && <td className={`${cell} text-right text-muted`}>−{formatMoney(batch.deductionRwf)}</td>}
                      <td className={`${cell} text-right font-semibold`}>{formatMoney(batch.netRwf)}</td>
                    </>
                  )}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
