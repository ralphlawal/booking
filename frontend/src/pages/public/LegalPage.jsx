import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { LOGO_BLUE_H } from '../../config/logos';

const PAGES = {
  terms: {
    title: 'Terms of Service',
    updated: '24 May 2026',
    intro: 'These terms explain how customers and businesses use BookAm Business for discovery, bookings, messages, payments, and support.',
    sections: [
      ['Using BookAm', 'You must provide accurate account, booking, business, and contact information. Do not misuse the platform, impersonate another person, upload harmful content, or interfere with the service.'],
      ['Business Responsibilities', 'Businesses are responsible for their services, prices, availability, staff, customer communications, cancellations, and compliance with local laws.'],
      ['Customer Responsibilities', 'Customers are responsible for attending appointments, giving correct contact details, reading service information, and contacting the business or BookAm support when something goes wrong.'],
      ['Payments', 'Where online payments are available, payments are processed through Stripe. BookAm may display booking and payment status, support dispute handling, and help with refunds where appropriate.'],
      ['Availability', 'We work to keep the service reliable, but BookAm may be unavailable during maintenance, outages, provider downtime, or technical incidents.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '24 May 2026',
    intro: 'This policy explains the information BookAm Business collects and how it is used to run bookings, accounts, payments, support, and safety features.',
    sections: [
      ['Information We Collect', 'We collect account details, business profiles, booking details, customer contact details, messages, support requests, payment status, and technical information needed to operate the service.'],
      ['How We Use Data', 'We use data to create bookings, show profiles, send notifications, provide support, prevent abuse, process payments, improve the product, and meet legal obligations.'],
      ['Sharing', 'Booking details are shared between the customer and the relevant business. Payment processing is handled by Stripe. Email delivery may be handled by Resend. We do not sell personal data.'],
      ['Retention', 'We keep records as needed for bookings, support, security, tax/accounting, dispute handling, and legal obligations. You can request account deletion through the app or support.'],
      ['Your Rights', 'You can ask to access, correct, export, or delete your data by contacting BookAm support. Some records may need to be kept where required by law or legitimate business reasons.'],
    ],
  },
  refunds: {
    title: 'Refunds, Cancellations and Disputes',
    updated: '24 May 2026',
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
    updated: '24 May 2026',
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
