import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Pencil } from 'lucide-react'
import Avatar from '../Avatar'
import StatusBadge from '../StatusBadge'
import { formatDate, formatPhone, maskNationalId } from '../../utils/format'

function avatarClass(member) {
  return member.status === 'ACTIVE' ? 'bg-primary-light text-primary' : 'bg-background text-muted'
}

function MemberActions({ member, onEdit }) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1">
      <Link
        to={`/members/${member.id}`}
        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-text"
        aria-label={t('members.table.view')}
        title={t('members.table.view')}
      >
        <Eye size={18} />
      </Link>
      <button
        type="button"
        onClick={() => onEdit(member)}
        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-text"
        aria-label={t('members.table.edit')}
        title={t('members.table.edit')}
      >
        <Pencil size={16} />
      </button>
    </div>
  )
}

export default function MemberTable({ members, onEdit }) {
  const { t } = useTranslation()

  return (
    <>
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="bg-background text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">{t('members.table.memberId')}</th>
            <th className="px-4 py-3 font-semibold">{t('members.table.fullName')}</th>
            <th className="px-4 py-3 font-semibold">{t('members.table.phone')}</th>
            <th className="px-4 py-3 font-semibold">{t('members.table.nationalId')}</th>
            <th className="px-4 py-3 font-semibold">{t('members.table.joinDate')}</th>
            <th className="px-4 py-3 font-semibold">{t('members.table.status')}</th>
            <th className="px-4 py-3 font-semibold">{t('members.table.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-text/5">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{member.memberCode}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={member.fullName} className={avatarClass(member)} />
                  <div>
                    <p className="font-medium text-text">{member.fullName}</p>
                    {member.address && <p className="text-xs text-muted">{member.address}</p>}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{formatPhone(member.phone)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{maskNationalId(member.nationalId)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatDate(member.joinDate)}</td>
              <td className="px-4 py-3">
                <StatusBadge active={member.status === 'ACTIVE'}>
                  {t(`members.status.${member.status}`)}
                </StatusBadge>
              </td>
              <td className="px-4 py-3">
                <MemberActions member={member} onEdit={onEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-text/5 md:hidden">
        {members.map((member) => (
          <li key={member.id} className="flex items-start gap-3 p-4">
            <Avatar name={member.fullName} className={avatarClass(member)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-text">{member.fullName}</p>
                <StatusBadge active={member.status === 'ACTIVE'}>
                  {t(`members.status.${member.status}`)}
                </StatusBadge>
              </div>
              <p className="text-xs font-medium text-primary">{member.memberCode}</p>
              {member.address && <p className="text-xs text-muted">{member.address}</p>}
              <p className="mt-1 text-sm">{formatPhone(member.phone)}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted">{formatDate(member.joinDate)}</p>
                <MemberActions member={member} onEdit={onEdit} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
