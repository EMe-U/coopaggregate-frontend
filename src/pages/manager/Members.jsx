import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function Members() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.members')}</PageTitle>
}
