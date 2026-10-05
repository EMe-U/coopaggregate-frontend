import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function RequestStatus() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.checkStatus')}</PageTitle>
}
