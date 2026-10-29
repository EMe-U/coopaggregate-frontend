import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDay, formatKg, formatMoney } from '../../utils/format'

const cell = 'whitespace-nowrap px-3 py-2'

// The batches a sale uses (or would use), in the order they are taken. kgField is takeKg in a
// preview and kg in a saved sale. withDelivered adds the delivery date (preview); withMoney adds
// gross and deduction before the net. A sale from before sales by grade has no money per batch:
// its members are paid through the lot share, which the last column says instead. renderAction
// adds a last cell, for example the preview's "Skip".
export default function SaleBatchesTable({ batches, kgField = 'kg', withDelivered, withMoney, paidByLotShare, renderAction }) {
  const { t } = useTranslation()
  const key = 'sales.batches'
  const columns = ['member', 'receipt', 'lot']
  if (withDelivered) columns.push('delivered')
  columns.push('kg')
  if (paidByLotShare) columns.push('money')
  else {
    if (withMoney) columns.push('gross', 'deduction')
    columns.push('net')
  }

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
            {renderAction && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-text/5">
          {batches.map((batch) => (
            <tr key={batch.deliveryId}>
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
              <td className={`${cell} font-mono text-xs`}>
                {batch.lotId ? (
                  <Link to={`/lots/${batch.lotId}`} className="text-primary hover:underline">
                    {batch.lotCode}
                  </Link>
                ) : (
                  batch.lotCode
                )}
              </td>
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
              {renderAction && <td className="px-2 py-1 text-right">{renderAction(batch)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
