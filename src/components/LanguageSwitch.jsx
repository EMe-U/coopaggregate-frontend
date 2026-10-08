import { useTranslation } from 'react-i18next'

const languages = ['en', 'rw']

export default function LanguageSwitch({ fullNames = false, className = 'text-sm' }) {
  const { t, i18n } = useTranslation()

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {languages.map((language, index) => (
        <span key={language} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted">|</span>}
          <button
            type="button"
            onClick={() => i18n.changeLanguage(language)}
            className={
              i18n.language === language ? 'font-semibold text-primary' : 'text-muted'
            }
          >
            {fullNames ? t(`language.${language}`) : language.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}
