import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function Lots() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.lots')}</PageTitle>
}
