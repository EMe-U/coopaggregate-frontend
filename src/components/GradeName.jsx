import { useTranslation } from 'react-i18next'

// Grade names come from the grade table (Big, Normal, Small). Names without a translation
// are shown as they are, so a grade added later still displays.
export default function GradeName({ name }) {
  const { t } = useTranslation()
  return t(`grades.${name}`, { defaultValue: name })
}
