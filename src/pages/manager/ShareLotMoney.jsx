import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function ShareLotMoney() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.share')}</PageTitle>
}
