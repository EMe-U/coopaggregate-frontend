import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'
import { getHealth } from '../../api/health'

const statusStyles = {
  checking: 'bg-background text-muted',
  connected: 'bg-primary-light text-primary',
  unreachable: 'bg-danger/10 text-danger',
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    getHealth()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <>
      <PageTitle>{t('pages.dashboard')}</PageTitle>
      <div className="rounded-xl bg-surface p-5 shadow-sm">
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyles[status]}`}>
          {t(`health.${status}`)}
        </span>
      </div>
    </>
  )
}
