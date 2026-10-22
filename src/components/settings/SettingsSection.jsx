import { useTranslation } from 'react-i18next'
import { CircleCheck, Save } from 'lucide-react'
import useNeedsInternet from '../../hooks/useNeedsInternet'

export default function SettingsSection({ icon: Icon, title, subtitle, badge, children }) {
  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-text">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  )
}

// The section's own Save button with the result of the last save. message is { ok } or { error }.
export function SaveBar({ dirty, saving, message, onSave, label }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()

  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-text/5 pt-4">
      {message?.ok && (
        <p role="status" className="mr-auto flex items-center gap-1.5 text-sm text-primary">
          <CircleCheck size={16} />
          {message.ok}
        </p>
      )}
      {message?.error && (
        <p role="alert" className="mr-auto text-sm text-danger">
          {message.error}
        </p>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving || needsInternet.offline}
        title={needsInternet.title}
        className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? t('settings.saving') : (label ?? t('settings.save'))}
      </button>
    </div>
  )
}
