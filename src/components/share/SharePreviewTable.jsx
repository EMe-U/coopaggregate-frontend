import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatKg, formatMoney } from '../../utils/format'

// Every amount here is calculated by the backend; this only displays them.
export default function SharePreviewTable({ members, totals }) {
  const { t } = useTranslation()
  const cell = 'whitespace-nowrap px-3 py-3'
  const columns = ['member', 'memberNumber', 'kg', 'sharePercent', 'share', 'deduction', 'net']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-background text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                {t(`share.table.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-text/5">
          {members.map((member) => (
            <tr key={member.memberId}>
              <td className={cell}>
                <Link to={`/members/${member.memberId}`} className="text-primary hover:underline">
                  {member.memberName}
                </Link>
              </td>
              <td className={`${cell} font-mono text-xs`}>{member.memberNumber}</td>
              <td className={cell}>{formatKg(member.memberKg)}</td>
              <td className={cell}>{member.sharePercent}%</td>
              <td className={cell}>{formatMoney(member.shareRwf)}</td>
              <td className={`${cell} text-danger`}>{formatMoney(member.deductionRwf)}</td>
              <td className={`${cell} font-semibold`}>{formatMoney(member.netRwf)}</td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot className="border-t-2 border-text/10 font-semibold">
            <tr>
              <td colSpan={2} className={cell}>
                {t('share.table.total')}
              </td>
              <td className={cell}>{formatKg(totals.memberKg)}</td>
              <td className={cell} />
              <td className={cell}>{formatMoney(totals.shareRwf)}</td>
              <td className={`${cell} text-danger`}>{formatMoney(totals.deductionRwf)}</td>
              <td className={cell}>{formatMoney(totals.netRwf)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
