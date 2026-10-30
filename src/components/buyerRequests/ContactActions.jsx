import { useTranslation } from 'react-i18next'
import { MessageCircle, Phone } from 'lucide-react'
import { formatPhone } from '../../utils/format'
import { internationalPhone, whatsappLink } from '../../utils/phone'

// The number to use: the WhatsApp number for WHATSAPP (the backend fills it with the main phone when
// the buyer gave none), otherwise the main phone. Older requests are CALL.
export function contactNumber(request) {
  return request.contactMethod === 'WHATSAPP' && request.whatsappNumber ? request.whatsappNumber : request.buyerPhone
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium'

// How the buyer wants to be contacted, with a Call button (the main phone) and, for WhatsApp, a
// WhatsApp button. compact shows icon-only buttons, for the list.
export default function ContactActions({ request, compact }) {
  const { t } = useTranslation()
  const whatsapp = request.contactMethod === 'WHATSAPP'
  const MethodIcon = whatsapp ? MessageCircle : Phone

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-sm text-text">
        <MethodIcon size={14} className="shrink-0 text-primary" />
        <span className="font-medium">{t(`buyerRequests.contact.${whatsapp ? 'WHATSAPP' : 'CALL'}`)}</span>
        <span className="whitespace-nowrap text-muted">{formatPhone(internationalPhone(contactNumber(request)))}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={`tel:${internationalPhone(request.buyerPhone)}`}
          aria-label={t('buyerRequests.contact.callLabel', { name: request.buyerName })}
          className={`${buttonClass} border-text/10 text-text hover:bg-background ${compact ? 'w-11 px-0' : ''}`}
        >
          <Phone size={16} />
          {!compact && t('buyerRequests.contact.call')}
        </a>
        {whatsapp && (
          <a
            href={whatsappLink(contactNumber(request))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('buyerRequests.contact.whatsappLabel', { name: request.buyerName })}
            className={`${buttonClass} border-primary/30 bg-primary-light text-primary hover:bg-primary/15 ${compact ? 'w-11 px-0' : ''}`}
          >
            <MessageCircle size={16} />
            {!compact && t('buyerRequests.contact.whatsapp')}
          </a>
        )}
      </div>
    </div>
  )
}
