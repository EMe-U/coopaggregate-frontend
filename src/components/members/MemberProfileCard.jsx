import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Layers, MessageSquare, Pencil, Printer, UserCheck, UserX } from 'lucide-react'
import Avatar from '../Avatar'
import StatusBadge from '../StatusBadge'
import VerifiedBadge, { VerifiedMark } from './VerifiedBadge'
import { genderLabel, maskNationalId, verifiedFieldsOf } from '../../members/memberDetails'
import { formatAddress, formatDate, formatPhone } from '../../utils/format'

// verified adds the mark of a detail that came from the identity check; wide takes the whole row.
function Detail({ label, verified, wide, children }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm text-text">
        {children}
        {verified && <VerifiedMark />}
      </p>
    </div>
  )
}

// Masked until the manager asks to see it. The choice lives only in this component: it is never
// stored and is gone when the page is left. A printout is always masked.
function NationalId({ nationalId }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const masked = maskNationalId(nationalId)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-mono" data-testid="national-id">
        {revealed ? (
          <>
            <span className="print:hidden">{nationalId}</span>
            <span className="hidden print:inline">{masked}</span>
          </>
        ) : (
          masked
        )}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        aria-label={revealed ? t('members.nationalId.hideLabel') : t('members.nationalId.showLabel')}
        aria-pressed={revealed}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20 hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary print:hidden"
      >
        {revealed ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
        {revealed ? t('members.nationalId.hide') : t('members.nationalId.show')}
      </button>
    </span>
  )
}

const smallButtonClass =
  'flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60'

// readOnly disables the buttons that change the member, for a profile shown without internet.
export default function MemberProfileCard({ member, onEdit, onToggleActive, changingStatus, readOnly }) {
  const { t } = useTranslation()
  const active = member.status === 'ACTIVE'
  const needsInternet = readOnly ? t('offline.needsInternet') : undefined
  const verifiedFields = verifiedFieldsOf(member)
  const address = formatAddress(member.address)

  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-1">
          <StatusBadge active={active}>
            {active ? t('members.detail.activeMember') : t('members.detail.inactiveMember')}
          </StatusBadge>
          <span className="font-mono text-xs text-muted">
            {t('members.detail.memberNumber', { code: member.memberCode })}
          </span>
          <VerifiedBadge member={member} withDetails />
        </div>

        <div className="flex gap-1.5 print:hidden">
          <button
            type="button"
            onClick={onEdit}
            disabled={readOnly}
            title={needsInternet}
            className={`${smallButtonClass} border-text/10 text-text hover:bg-background`}
          >
            <Pencil size={13} />
            {t('members.detail.edit')}
          </button>
          {active ? (
            <button
              type="button"
              onClick={onToggleActive}
              disabled={changingStatus || readOnly}
              title={needsInternet}
              className={`${smallButtonClass} border-danger/30 text-danger hover:bg-danger/5`}
            >
              <UserX size={13} />
              {t('members.detail.deactivate')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleActive}
              disabled={changingStatus || readOnly}
              title={needsInternet}
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
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-text/5 pt-4">
        <Detail label={t('members.detail.phone')}>{formatPhone(member.phone)}</Detail>
        <Detail label={t('members.detail.nationalId')}>
          {member.nationalId ? (
            <NationalId key={member.id} nationalId={member.nationalId} />
          ) : (
            <span className="text-muted">{t('members.detail.notProvided')}</span>
          )}
        </Detail>
        <Detail label={t('members.detail.joinDate')}>{formatDate(member.joinDate)}</Detail>
        {member.birthDate && (
          <Detail label={t('members.detail.birthDate')} verified={verifiedFields.includes('birthdate')}>
            {formatDate(member.birthDate)}
          </Detail>
        )}
        {member.gender && (
          <Detail label={t('members.detail.gender')} verified={verifiedFields.includes('gender')}>
            {genderLabel(t, member.gender)}
          </Detail>
        )}
        {member.email && (
          <Detail label={t('members.detail.email')} verified={verifiedFields.includes('email')} wide>
            {member.email}
          </Detail>
        )}
        {address && (
          <Detail label={t('members.detail.address')} verified={verifiedFields.includes('address')} wide>
            {address}
          </Detail>
        )}
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
        <Link
          to={`/members/${member.id}/batches`}
          className="flex items-center gap-2 rounded-lg border border-text/10 px-3 py-2 text-sm font-medium text-text hover:bg-background"
        >
          <Layers size={16} />
          {t('members.detail.batches')}
        </Link>
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
