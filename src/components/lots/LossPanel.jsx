import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import LossForm from './LossForm'

export default function LossPanel({ reloadKey, onSaved }) {
  const { t } = useTranslation()

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
        <TriangleAlert size={12} />
        {t('lots.loss.badge')}
      </span>
      <h2 className="mt-2 text-lg font-semibold text-text">{t('lots.loss.title')}</h2>
      <p className="mb-4 text-sm text-muted">{t('lots.loss.subtitle')}</p>
      <LossForm reloadKey={reloadKey} onSaved={onSaved} />
    </section>
  )
}
