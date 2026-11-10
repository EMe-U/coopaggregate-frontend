import { useTranslation } from 'react-i18next'

// The privacy notice for members, open to everyone. The [ ] parts are for the cooperative to fill in.
export default function Privacy() {
  const { t } = useTranslation()
  const sections = t('privacy.sections', { returnObjects: true })

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('privacy.title')}</h1>
      <p className="mt-2 text-sm text-muted">{t('privacy.subtitle')}</p>

      <div className="mt-8 space-y-6 rounded-xl bg-surface p-5 shadow-sm sm:p-8">
        {Array.isArray(sections) &&
          sections.map((section) => (
            <section key={section.heading} className="space-y-2 break-words text-sm leading-relaxed text-text sm:text-base">
              <h2 className="text-lg font-semibold text-primary">{section.heading}</h2>
              {section.items && (
                <ul className="list-disc space-y-1.5 pl-5 marker:text-muted">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.text?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
      </div>
    </article>
  )
}
