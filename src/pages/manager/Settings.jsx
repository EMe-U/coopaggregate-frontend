import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function Settings() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.settings')}</PageTitle>
}
