import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function Ledger() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.ledger')}</PageTitle>
}
