import { useEffect, useLayoutEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUp, ChevronDown, Info, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { formatPhone } from '../../utils/format'

// The cooperative's contact card comes after this paragraph of section 1 (its last) and section 8
// (its first, "Contact the cooperative using the details below").
const CONTACT_AFTER = { 0: 1, 7: 0 }
const sectionId = (index) => `section-${index + 1}`

// Printed: no site navigation, contents or buttons, black on white. Only present while this page is open.
const PRINT_CSS = `
@media print {
  #root header, #root footer, [data-print-hide] { display: none !important; }
  .privacy-page, .privacy-page * {
    color: #000 !important;
    background: #fff !important;
    box-shadow: none !important;
    print-color-adjust: economy !important;
    -webkit-print-color-adjust: economy !important;
  }
  .privacy-page { max-width: none !important; padding: 0 !important; }
  .privacy-layout { display: block !important; }
  .privacy-contact { border: 1px solid #000 !important; }
  .privacy-page a { text-decoration: underline !important; }
  .privacy-page section { break-inside: avoid; }
}
`

function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-white/60">{label}</dt>
        <dd className="font-medium wrap-break-word">{children}</dd>
      </div>
    </div>
  )
}

// The same contact details as the public home page (Settings, through the public info), in the same
// look. A value that is not set says so; nothing is ever filled in for it.
function ContactCard({ info }) {
  const { t } = useTranslation()
  const cooperative = info.data
  const notSet = <span className="font-normal italic text-white/70">{t('privacy.contact.notSet')}</span>

  return (
    <div data-testid="privacy-contact" className="privacy-contact mt-5 rounded-2xl bg-[#0b3a1f] p-5 text-white sm:p-7">
      <h3 className="text-lg font-semibold">
        {t('publicHome.contact.title', { name: cooperative?.cooperativeName ?? t('app.cooperative') })}
      </h3>
      {!cooperative ? (
        <p className="mt-3 text-sm text-white/85" role={info.error ? 'alert' : undefined}>
          {info.error ? t('privacy.contact.error') : t('privacy.contact.loading')}
        </p>
      ) : (
        <dl className="mt-5 space-y-4 text-sm">
          <ContactRow icon={MapPin} label={t('publicHome.info.location')}>
            {cooperative.location || notSet}
          </ContactRow>
          <ContactRow icon={Phone} label={t('publicHome.info.phone')}>
            {cooperative.cooperativePhone ? (
              <a href={`tel:${cooperative.cooperativePhone}`} className="underline">
                {formatPhone(cooperative.cooperativePhone)}
              </a>
            ) : (
              notSet
            )}
          </ContactRow>
          <ContactRow icon={Mail} label={t('publicHome.info.email')}>
            {cooperative.cooperativeEmail ? (
              <a href={`mailto:${cooperative.cooperativeEmail}`} className="break-all underline">
                {cooperative.cooperativeEmail}
              </a>
            ) : (
              notSet
            )}
          </ContactRow>
        </dl>
      )}
    </div>
  )
}

function ContentsList({ sections }) {
  return (
    <ol className="space-y-1 text-sm">
      {sections.map((section, index) => (
        <li key={section.heading}>
          <a
            href={`#${sectionId(index)}`}
            className="block rounded-md px-2 py-1.5 text-text hover:bg-primary-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {section.heading}
          </a>
        </li>
      ))}
    </ol>
  )
}

// Changing the language changes the length of the text above the reader. The first block shown
// under the site header (a heading, paragraph or list item) is kept at the same place on screen.
// Both languages have the same blocks in the same order, so its position in the list finds it again.
const BLOCKS = '#privacy-top, #in-short, .privacy-page section h2, .privacy-page section p, .privacy-page section li'

function readingLine() {
  return document.querySelector('#root header')?.getBoundingClientRect().bottom ?? 0
}

function useKeepPlaceOnLanguageChange(language) {
  const place = useRef(null)
  const firstLanguage = useRef(language)

  useEffect(() => {
    function remember() {
      const line = readingLine() - 1
      const blocks = [...document.querySelectorAll(BLOCKS)]
      const index = blocks.findIndex((block) => block.getBoundingClientRect().top >= line)
      place.current = window.scrollY > 0 && index >= 0 ? { index, top: blocks[index].getBoundingClientRect().top } : null
    }
    remember()
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [])

  useLayoutEffect(() => {
    if (language === firstLanguage.current) return
    firstLanguage.current = language
    const saved = place.current
    const element = saved && document.querySelectorAll(BLOCKS)[saved.index]
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - saved.top)
  }, [language])
}

// The privacy notice for members, open to everyone. The [ ] parts are for the cooperative to fill in.
export default function Privacy() {
  const { t, i18n } = useTranslation()
  const publicInfo = useOutletContext()
  const sections = t('privacy.sections', { returnObjects: true })
  const summary = t('privacy.inShort.items', { returnObjects: true })
  useKeepPlaceOnLanguageChange(i18n.language)

  if (!Array.isArray(sections)) return null

  return (
    <article className="privacy-page mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <style>{PRINT_CSS}</style>

      <div id="privacy-top" className="scroll-mt-6 border-b border-text/10 pb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck size={14} aria-hidden="true" />
          {t('privacy.cooperative')}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">{t('privacy.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('privacy.updated')}</p>
      </div>

      <div className="privacy-layout mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside data-print-hide className="hidden lg:block">
          <nav aria-labelledby="privacy-contents-wide" className="sticky top-24">
            <p id="privacy-contents-wide" className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('privacy.contents')}
            </p>
            <ContentsList sections={sections} />
          </nav>
        </aside>

        <div className="min-w-0">
          <div
            id="in-short"
            className="max-w-[70ch] rounded-2xl border border-primary/15 bg-primary-light/60 p-5 sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-base font-semibold text-primary">
              <Info size={18} aria-hidden="true" />
              {t('privacy.inShort.title')}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text sm:text-base">
              {Array.isArray(summary) &&
                summary.map((item) => (
                  <li key={item.label} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      <strong className="font-semibold">{item.label}</strong> {item.text}
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <details data-print-hide className="group mt-6 rounded-xl bg-surface shadow-sm lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
              {t('privacy.contents')}
              <ChevronDown size={18} aria-hidden="true" className="text-muted transition-transform group-open:rotate-180" />
            </summary>
            <nav aria-label={t('privacy.contents')} className="border-t border-text/5 px-2 py-2">
              <ContentsList sections={sections} />
            </nav>
          </details>

          <div className="mt-10 space-y-12">
            {sections.map((section, index) => (
              <section
                key={section.heading}
                id={sectionId(index)}
                aria-labelledby={`${sectionId(index)}-title`}
                className="max-w-[70ch] scroll-mt-6 text-base leading-relaxed text-text"
              >
                <h2 id={`${sectionId(index)}-title`} className="text-xl font-semibold text-primary">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 break-words">
                  {section.items && (
                    <ul className="list-disc space-y-2 pl-5 marker:text-primary">
                      {section.items.map((item) => (
                        <li key={item} className="pl-1">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.text?.map((paragraph, paragraphIndex) => (
                    <div key={paragraph}>
                      <p>{paragraph}</p>
                      {CONTACT_AFTER[index] === paragraphIndex && <ContactCard info={publicInfo.info} />}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p data-print-hide className="mt-12 border-t border-text/10 pt-6">
            <a
              href="#privacy-top"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowUp size={16} aria-hidden="true" />
              {t('privacy.backToTop')}
            </a>
          </p>
        </div>
      </div>
    </article>
  )
}
