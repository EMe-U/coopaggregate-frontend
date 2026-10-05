import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function Payments() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.payments')}</PageTitle>
}
