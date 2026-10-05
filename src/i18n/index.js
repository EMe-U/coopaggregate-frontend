import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import rw from './rw.json'

const LANGUAGE_KEY = 'language'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    rw: { translation: rw },
  },
  lng: localStorage.getItem(LANGUAGE_KEY) || 'rw',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.language

i18n.on('languageChanged', (language) => {
  localStorage.setItem(LANGUAGE_KEY, language)
  document.documentElement.lang = language
})

export default i18n
