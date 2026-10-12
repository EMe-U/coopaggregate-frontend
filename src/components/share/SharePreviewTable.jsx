import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Avatar from '../Avatar'
import { formatKg, formatMoney } from '../../utils/format'

// Every amount here is calculated by the backend; this only displays them.
export default function SharePreviewTable({ preview }) {
  const { t } = useTranslation()
  const cell = 'px-3 py-3'
  // Money cells may wrap ("120,000" over "RWF") so the last column stays visible on laptops.
  const number = `${cell} text-right`

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-background text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 font-semibold">{t('share.table.member')}</th>
            {['delivered', 'share', 'shareOfMoney', 'deduction', 'net'].map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                {t(`share.table.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-text/5">
          {preview.members.map((member) => (
            <tr key={member.memberId}>
              <td className={`${cell} min-w-44`}>
                <div className="flex items-center gap-2">
                  <Avatar name={member.memberName} />
                  <div>
                    <Link to={`/members/${member.memberId}`} className="font-medium text-text hover:text-primary hover:underline">
                      {member.memberName}
                    </Link>
                    <p className="font-mono text-xs text-muted">{member.memberNumber}</p>
                  </div>
                </div>
              </td>
              <td className={`${number} whitespace-nowrap`}>{formatKg(member.memberKg)}</td>
              <td className={`${number} text-muted`}>{member.sharePercent}%</td>
              <td className={number}>{formatMoney(member.shareRwf)}</td>
              <td className={`${number} text-danger`}>{formatMoney(member.deductionRwf)}</td>
              <td className={`${number} font-semibold text-primary`}>{formatMoney(member.netRwf)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-text/10 bg-background/60 font-semibold">
          <tr>
            <td className={`${cell} uppercase`}>{t('share.table.total')}</td>
            <td className={`${number} whitespace-nowrap`}>{formatKg(preview.deliveredKg)}</td>
            <td className={number}>100%</td>
            <td className={number}>{formatMoney(preview.totals.shareRwf)}</td>
            <td className={`${number} text-danger`}>{formatMoney(preview.totals.deductionRwf)}</td>
            <td className={`${number} text-lg text-primary`}>{formatMoney(preview.totals.netRwf)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
