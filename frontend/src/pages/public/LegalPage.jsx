import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { LOGO_BLUE_H } from '../../config/logos';

const PAGES = {
  terms: {
    title: 'Terms of Service',
    updated: '28 August 2026',
    intro: 'These terms explain the rules for customers and businesses using BookAm to discover services, manage bookings, communicate, and use available payment features.',
    sections: [
      ['Using BookAm', 'You must provide accurate account, booking, business, and contact information. Do not misuse the platform, impersonate another person, upload harmful content, or interfere with the service.'],
      ['Business Responsibilities', 'Businesses are responsible for their services, prices, availability, staff, customer communications, cancellations, and compliance with local laws.'],
      ['Customer Responsibilities', 'Customers are responsible for attending appointments, giving correct contact details, reading service information, and contacting the business or BookAm support when something goes wrong.'],
      ['Payments, cancellations and refunds', 'A business’s displayed cancellation policy applies to its bookings. Where an online payment option is enabled, payment processing is provided by the relevant payment provider. Refund eligibility, timing, and any cancellation fee depend on the applicable policy, payment status, and the circumstances of the booking.'],
      ['Content and reviews', 'You are responsible for content you submit, including business listings, photos, posts, messages, and reviews. Content must be accurate, lawful, and respectful. We may remove content that is misleading, harmful, unlawful, or violates these terms.'],
      ['Availability', 'We work to keep the service reliable, but BookAm may be unavailable during maintenance, outages, provider downtime, or technical incidents.'],
      ['Changes and contact', 'We may update BookAm and these terms as the product develops. For support or questions, contact hello@bookam.business.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '28 August 2026',
    intro: 'This policy explains what information BookAm collects, why it is used, and the choices available to customers and businesses.',
    sections: [
      ['Information we collect', 'This can include account details such as name, email address, phone number and profile photo; business listing details; booking, service, message and support information; and device or technical information needed to secure and operate BookAm. If you choose “use my location”, we use your location to show relevant nearby businesses and appointments.'],
      ['How we use information', 'We use information to create and manage accounts and bookings, show business listings, provide customer and business support, send requested notifications, prevent fraud and abuse, improve reliability, and meet legal obligations.'],
      ['Who receives information', 'Booking details and messages are shared with the customer and the relevant business. If a payment or communication provider is enabled for a feature, it receives only the information needed to provide that feature. We do not sell personal data.'],
      ['Payments', 'BookAm does not store full card numbers or card security codes. Payment information is handled by the payment provider used for the transaction. We may store limited payment references and status information needed for bookings, refunds, accounting, and support.'],
      ['Retention and deletion', 'We retain information for as long as needed to provide BookAm, keep the service secure, resolve disputes, meet accounting or legal obligations, and enforce our terms. Customers can delete their account in Profile → Account. Businesses can delete their account in Settings → Security, privacy & data. Deletion is permanent, subject to records we must retain by law or for legitimate security and dispute purposes.'],
      ['Your choices', 'You can update account information in the app, control notification and location permissions in your device settings, and contact hello@bookam.business to request access, correction, export, or deletion of personal information.'],
    ],
  },
  refunds: {
    title: 'Refunds, Cancellations and Disputes',
    updated: '28 August 2026',
    intro: 'This page explains how cancellations, refunds, and service disputes should be handled on BookAm Business.',
    sections: [
      ['Cancellations', 'Customers should cancel as early as possible using their booking link or by contacting the business. Businesses may set their own cancellation rules and should communicate them clearly.'],
      ['Refunds', 'Refund eligibility depends on the business policy, the payment status, and the facts of the booking. If online payment was taken, approved refunds are processed back through the payment method where possible.'],
      ['Disputes', 'Customers can raise a dispute if a paid service was not delivered, was materially different from the listing, or there was another serious problem. Include clear details so support can review it.'],
      ['Business Review', 'Businesses may be contacted for evidence, notes, or a response. BookAm support can reject unsupported claims or help issue refunds where appropriate.'],
      ['Support', 'For urgent payment or booking issues, contact support with your booking reference, business name, date, and payment reference if available.'],
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    updated: '28 August 2026',
    intro: 'This policy explains how BookAm Business uses cookies and browser storage to keep the app secure, reliable, and useful.',
    sections: [
      ['Essential Cookies and Storage', 'We use essential cookies, local storage, and similar browser storage to keep users signed in, remember preferences, protect accounts, manage chat sessions, save cookie choices, and support booking flows.'],
      ['Optional Analytics', 'If you accept analytics, we may use privacy-conscious analytics tools to understand which features are used, spot reliability issues, and improve the product. Analytics is optional and should not be used until consent is saved.'],
      ['Third-Party Services', 'BookAm may use providers such as Stripe for payments, Firebase for authentication, Resend for email, and hosting or security providers. These services may set their own necessary cookies or storage when their features are used.'],
      ['Managing Choices', 'You can accept all cookies or use essential-only mode from the cookie banner. You can also clear site data in your browser to reset your choice.'],
      ['No Sale of Data', 'BookAm does not sell personal data. Any analytics should be used to operate, secure, and improve the platform.'],
    ],
  },
};

export default function LegalPage() {
  const { page = 'terms' } = useParams();
  const content = PAGES[page] || PAGES.terms;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary-600">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
        </div>

        <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs font-bold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> BookAm Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{content.title}</h1>
          <p className="text-sm text-gray-400 mt-2">Last updated: {content.updated}</p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-5">{content.intro}</p>

          <div className="mt-8 space-y-6">
            {content.sections.map(([title, text]) => (
              <div key={title}>
                <h2 className="text-lg font-bold mb-2">{title}</h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Need help? Email{' '}
              <a href="mailto:hello@bookam.business" className="font-semibold text-primary-600 dark:text-primary-400 inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> hello@bookam.business
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
