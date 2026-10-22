import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, Mail, MapPin, PackageCheck, SendHorizonal, ShoppingCart } from 'lucide-react'
import usePublicInfo from '../../hooks/usePublicInfo'
import { formatKg } from '../../utils/format'
import { publicGradeName } from './publicGrade'

const sectionClass = 'mx-auto max-w-6xl px-4'

function InfoCard({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-surface p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="wrap-break-word text-sm font-semibold text-text">{children}</p>
      </div>
    </div>
  )
}

function GradeCard({ grade }) {
  const { t, i18n } = useTranslation()
  const details = [
    { key: 'sizeInfo', value: grade.sizeInfo },
    { key: 'packaging', value: grade.packaging },
  ].filter((detail) => detail.value)

  return (
    <article className="flex min-w-0 flex-col rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
          {grade.code}
        </span>
        <h3 className="min-w-0 wrap-break-word text-lg font-semibold text-text">{publicGradeName(grade, i18n.language)}</h3>
      </div>
      {grade.description && <p className="mt-3 text-sm text-muted">{grade.description}</p>}
      {details.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-background p-3 text-sm">
          {details.map(({ key, value }) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs text-muted">{t(`publicHome.grades.${key}`)}</dt>
              <dd className="wrap-break-word font-medium text-text">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-auto pt-5">
        <Link
          to={`/request?grade=${encodeURIComponent(grade.code)}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <ShoppingCart size={16} />
          {t('publicHome.sendRequest')}
        </Link>
      </div>
    </article>
  )
}

export default function Home() {
  const { t } = useTranslation()
  const { info, grades, reload } = usePublicInfo()
  const cooperative = info.data

  const failed = info.error && grades.error
  const gradeList = grades.data ?? []

  return (
    <>
      <section className="bg-linear-to-br from-primary to-[#0b3a1f] py-14 text-white sm:py-20">
        <div className={sectionClass}>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
            {cooperative?.cooperativeName ?? t('app.cooperative')}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/85">
            {cooperative?.location
              ? t('publicHome.heroWithLocation', { location: cooperative.location })
              : t('publicHome.hero')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#grades"
              onClick={(event) => {
                event.preventDefault()
                document.getElementById('grades')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-primary hover:bg-primary-light"
            >
              {t('publicHome.viewGrades')}
              <ArrowDown size={16} />
            </a>
            <Link
              to="/request"
              className="flex min-h-12 items-center gap-2 rounded-lg border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t('publicHome.sendRequest')}
            </Link>
          </div>
        </div>
      </section>

      {failed && (
        <div className={`${sectionClass} py-10`}>
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {t('publicHome.error')}
            <button type="button" onClick={reload} className="min-h-11 font-medium underline">
              {t('publicHome.retry')}
            </button>
          </div>
        </div>
      )}

      {cooperative && (
        <section className={`${sectionClass} -mt-6 relative`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cooperative.location && (
              <InfoCard icon={MapPin} label={t('publicHome.info.location')}>
                {cooperative.location}
              </InfoCard>
            )}
            {Number(cooperative.minOrderKg) > 0 && (
              <InfoCard icon={PackageCheck} label={t('publicHome.info.minOrder')}>
                {formatKg(Number(cooperative.minOrderKg))}
              </InfoCard>
            )}
            {cooperative.cooperativeEmail && (
              <InfoCard icon={Mail} label={t('publicHome.info.email')}>
                {cooperative.cooperativeEmail}
              </InfoCard>
            )}
          </div>
        </section>
      )}

      {!grades.data && !grades.error && (
        <section className={`${sectionClass} py-10`}>
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((index) => (
              <div key={index} className="h-64 animate-pulse rounded-xl bg-surface shadow-sm" />
            ))}
          </div>
        </section>
      )}

      {gradeList.length > 0 && (
        <section id="grades" className={`${sectionClass} scroll-mt-4 py-10`}>
          <h2 className="text-xl font-semibold text-text">{t('publicHome.grades.title')}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {gradeList.map((grade) => (
              <GradeCard key={grade.code} grade={grade} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-surface py-10">
        <div className={sectionClass}>
          <h2 className="text-xl font-semibold text-text">{t('publicHome.steps.title')}</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {['send', 'review', 'status'].map((step, index) => (
              <li key={step} className="rounded-xl bg-background p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold text-text">{t(`publicHome.steps.${step}.title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`publicHome.steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
          <Link
            to="/request"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <SendHorizonal size={16} />
            {t('publicHome.sendRequest')}
          </Link>
        </div>
      </section>

      {cooperative && (cooperative.location || cooperative.cooperativeEmail) && (
        <section id="contact" className={`${sectionClass} scroll-mt-4 py-10`}>
          <div className="rounded-xl bg-primary p-6 text-white sm:p-8">
            <h2 className="text-xl font-semibold">{t('publicHome.contact.title', { name: cooperative.cooperativeName ?? t('app.cooperative') })}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              {cooperative.location && (
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-white/70" />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-white/70">{t('publicHome.info.location')}</dt>
                    <dd className="font-medium">{cooperative.location}</dd>
                  </div>
                </div>
              )}
              {cooperative.cooperativeEmail && (
                <div className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-white/70" />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-white/70">{t('publicHome.info.email')}</dt>
                    <dd className="break-all font-medium">
                      <a href={`mailto:${cooperative.cooperativeEmail}`} className="underline">
                        {cooperative.cooperativeEmail}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}
    </>
  )
}
