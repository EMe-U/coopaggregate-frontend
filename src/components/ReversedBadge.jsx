import { useTranslation } from 'react-i18next'

// The reason shows on hover.
export default function ReversedBadge({ reason }) {
  const { t } = useTranslation()
  return (
    <span
      title={reason ? t('reversal.reasonTooltip', { reason }) : undefined}
      className="inline-block cursor-help rounded-md bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
    >
      {t('reversal.reversed')}
    </span>
  )
}
