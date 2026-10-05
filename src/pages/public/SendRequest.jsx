import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function SendRequest() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.sendRequest')}</PageTitle>
}
