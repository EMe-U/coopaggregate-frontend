import { useTranslation } from 'react-i18next'
import PageTitle from '../components/PageTitle'

export default function Login() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-sm">
        <PageTitle>{t('pages.login')}</PageTitle>
      </div>
    </div>
  )
}
