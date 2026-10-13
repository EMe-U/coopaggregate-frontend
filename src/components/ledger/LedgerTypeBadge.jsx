import { useTranslation } from 'react-i18next'

const styles = {
  DELIVERY: 'bg-primary-light text-primary',
  LOSS: 'bg-danger/10 text-danger',
  SALE: 'bg-sky-100 text-sky-800',
  SHARE: 'bg-violet-100 text-violet-800',
  PAYMENT: 'bg-warning/15 text-amber-800',
  REVERSAL: 'bg-text/10 text-text',
}

export default function LedgerTypeBadge({ type }) {
  const { t } = useTranslation()

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type] ?? styles.REVERSAL}`}>
      {t(`ledger.types.${type}`, { defaultValue: type })}
    </span>
  )
}
