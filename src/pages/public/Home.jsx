import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function Home() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.home')}</PageTitle>
}
