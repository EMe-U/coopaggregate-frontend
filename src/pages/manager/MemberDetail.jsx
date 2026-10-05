import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/PageTitle'

export default function MemberDetail() {
  const { t } = useTranslation()
  return <PageTitle>{t('pages.memberDetail')}</PageTitle>
}
