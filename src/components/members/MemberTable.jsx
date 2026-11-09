import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Pencil } from 'lucide-react'
import Avatar from '../Avatar'
import StatusBadge from '../StatusBadge'
import VerifiedBadge from './VerifiedBadge'
import { formatDate, formatPhone } from '../../utils/format'

function avatarClass(member) {
  return member.status === 'ACTIVE' ? 'bg-primary-light text-primary' : 'bg-background text-muted'
}

// The national ID as the list gives it (already masked, never the full ID), with the member
// number below. A member without one gets a link to the edit form to add it.
function NationalIdCell({ member, onEdit, readOnly }) {
  const { t } = useTranslation()

  return (
    <div className="min-w-0">
      {member.nationalIdMasked ? (
        <p className="whitespace-nowrap font-mono text-sm text-text">{member.nationalIdMasked}</p>
      ) : (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span>{t('members.table.noNationalId')}</span>
          <button
            type="button"
            onClick={() => onEdit(member)}
            disabled={readOnly}
            className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
            aria-label={t('members.table.addNationalIdFor', { name: member.fullName })}
            title={readOnly ? t('offline.needsInternet') : undefined}
          >
            {t('members.table.addNationalId')}
          </button>
        </p>
      )}
      <p className="whitespace-nowrap text-xs text-muted">{member.memberCode}</p>
    </div>
  )
}

function MemberActions({ member, onEdit, readOnly }) {
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
        disabled={readOnly}
        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={t('members.table.edit')}
        title={readOnly ? t('offline.needsInternet') : t('members.table.edit')}
      >
        <Pencil size={16} />
      </button>
    </div>
  )
}

// readOnly disables editing, for members shown from the copy saved on this device.
export default function MemberTable({ members, onEdit, readOnly }) {
  const { t } = useTranslation()

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('members.table.nationalId')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.table.fullName')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.table.phone')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.table.joinDate')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.table.status')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3">
                  <NationalIdCell member={member} onEdit={onEdit} readOnly={readOnly} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.fullName} className={avatarClass(member)} />
                    <div>
                      <p className="flex flex-wrap items-center gap-1.5 font-medium text-text">
                        {member.fullName}
                        <VerifiedBadge member={member} />
                      </p>
                      {member.address && <p className="text-xs text-muted">{member.address}</p>}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{formatPhone(member.phone)}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatDate(member.joinDate)}</td>
                <td className="px-4 py-3">
                  <StatusBadge active={member.status === 'ACTIVE'}>
                    {t(`members.status.${member.status}`)}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <MemberActions member={member} onEdit={onEdit} readOnly={readOnly} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-text/5 md:hidden">
        {members.map((member) => (
          <li key={member.id} className="flex items-start gap-3 p-4">
            <Avatar name={member.fullName} className={avatarClass(member)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-1.5 font-medium text-text">
                  {member.fullName}
                  <VerifiedBadge member={member} />
                </p>
                <StatusBadge active={member.status === 'ACTIVE'}>
                  {t(`members.status.${member.status}`)}
                </StatusBadge>
              </div>
              <div className="mt-0.5">
                <NationalIdCell member={member} onEdit={onEdit} readOnly={readOnly} />
              </div>
              {member.address && <p className="text-xs text-muted">{member.address}</p>}
              <p className="mt-1 text-sm">{formatPhone(member.phone)}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted">{formatDate(member.joinDate)}</p>
                <MemberActions member={member} onEdit={onEdit} readOnly={readOnly} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
