import { useTranslation } from 'react-i18next'
import { MessageSquare, Pencil, Printer, UserCheck, UserX } from 'lucide-react'
import Avatar from '../Avatar'
import StatusBadge from '../StatusBadge'
import { formatDate, formatPhone } from '../../utils/format'

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-text">{children}</p>
    </div>
  )
}

const smallButtonClass =
  'flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-60'

export default function MemberProfileCard({ member, onEdit, onToggleActive, changingStatus }) {
  const { t } = useTranslation()
  const active = member.status === 'ACTIVE'

  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm print:break-inside-avoid">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-1">
          <StatusBadge active={active}>
            {active ? t('members.detail.activeMember') : t('members.detail.inactiveMember')}
          </StatusBadge>
          <span className="font-mono text-xs text-muted">
            {t('members.detail.memberNumber', { code: member.memberCode })}
          </span>
        </div>

        <div className="flex gap-1.5 print:hidden">
          <button
            type="button"
            onClick={onEdit}
            className={`${smallButtonClass} border-text/10 text-text hover:bg-background`}
          >
            <Pencil size={13} />
            {t('members.detail.edit')}
          </button>
          {active ? (
            <button
              type="button"
              onClick={onToggleActive}
              disabled={changingStatus}
              className={`${smallButtonClass} border-danger/30 text-danger hover:bg-danger/5`}
            >
              <UserX size={13} />
              {t('members.detail.deactivate')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleActive}
              disabled={changingStatus}
              className={`${smallButtonClass} border-primary/30 text-primary hover:bg-primary-light`}
            >
              <UserCheck size={13} />
              {t('members.detail.activate')}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Avatar
          name={member.fullName}
          size="lg"
          className={active ? 'bg-primary text-white' : 'bg-muted text-white'}
        />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text">{member.fullName}</h1>
          {member.address && <p className="text-sm text-muted">{member.address}</p>}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-text/5 pt-4">
        <Detail label={t('members.detail.phone')}>{formatPhone(member.phone)}</Detail>
        <Detail label={t('members.detail.nationalId')}>
          {member.nationalId ?? <span className="text-muted">{t('members.detail.notProvided')}</span>}
        </Detail>
        <Detail label={t('members.detail.joinDate')}>{formatDate(member.joinDate)}</Detail>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-primary/60 px-3 py-2 text-sm font-medium text-white"
        >
          <MessageSquare size={16} />
          {t('members.detail.sendSms')}
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] uppercase">
            {t('members.detail.soon')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-text/10 px-3 py-2 text-sm font-medium text-text hover:bg-background"
        >
          <Printer size={16} />
          {t('members.detail.print')}
        </button>
      </div>
    </div>
  )
}
