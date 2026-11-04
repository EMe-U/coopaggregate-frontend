import { useTranslation } from 'react-i18next'
import { FlaskConical, ShieldCheck } from 'lucide-react'
import { formatDay } from '../../utils/format'

// Only for members whose identity was verified at registration; nothing for the others.
// A MOCK verification checked no real identity, so it is a grey "Test verification" badge.
// withDetails adds how and when, for the profile.
export default function VerifiedBadge({ member, withDetails }) {
  const { t } = useTranslation()
  if (!member.verified) return null

  if (member.verificationMethod === 'MOCK') {
    return (
      <span
        title={t('members.verified.testHint')}
        className="inline-flex cursor-help items-center gap-1 rounded-md bg-background px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-text/10"
      >
        <FlaskConical size={12} />
        {t('members.verified.test')}
        {withDetails && ` · ${formatDay(member.verifiedAt)}`}
      </span>
    )
  }

  const method = t(`memberVerification.method.${member.verificationMethod}`, { defaultValue: member.verificationMethod })
  return (
    <span
      title={withDetails ? undefined : method}
      className="inline-flex items-center gap-1 rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary"
    >
      <ShieldCheck size={12} />
      {t('members.verified.badge')}
      {withDetails && ` · ${method} · ${formatDay(member.verifiedAt)}`}
    </span>
  )
}

// The small mark beside one detail that came from the identity check.
export function VerifiedMark() {
  const { t } = useTranslation()
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 whitespace-nowrap align-middle text-[11px] font-medium normal-case tracking-normal text-primary">
      <ShieldCheck size={11} aria-hidden="true" />
      {t('members.verified.mark')}
    </span>
  )
}
