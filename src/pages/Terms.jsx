import { BRAND } from '@/lib/constants';

const SECTIONS = [
  {
    title: 'Using Dwellmark',
    body: 'You may browse listings without an account. Creating an account lets you save homes, save searches, contact listing owners and publish listings. You are responsible for the accuracy of what you publish and for keeping your login secure.',
  },
  {
    title: 'Listings and moderation',
    body: 'New listings are reviewed by an administrator before publication. We may reject, archive or remove a listing that is inaccurate, duplicated, misleading, unlawful or that we believe is fraudulent. Where a listing is rejected, the reason is shown to the account that submitted it.',
  },
  {
    title: 'Accuracy of information',
    body: 'Listings are published by their own account holders. Dwellmark does not guarantee that any listing is accurate, available, or that the person behind it owns the property, unless a verification badge is shown and the verification has actually been completed.',
  },
  {
    title: 'Estimates and calculators',
    body: 'Value estimates and mortgage and affordability figures are indicative calculations for planning. They are not appraisals, loan offers, approvals or financial advice, and they are not connected to an external valuation or mortgage-rate provider.',
  },
  {
    title: 'Fair housing',
    body: 'Listings and messages must comply with fair housing law. Discriminatory content is not permitted and can be reported from the listing page.',
  },
  {
    title: 'Acceptable use',
    body: 'Do not post false listings, scrape the site, attempt to access records that are not yours, upload unsafe files, or use the enquiry and application features to send unsolicited marketing.',
  },
  {
    title: 'Applications and documents',
    body: 'Only attach documents a landlord has asked for. Dwellmark runs no credit checks, background checks or electronic signatures and does not process rent or deposits.',
  },
  {
    title: 'Reporting and enforcement',
    body: 'Anyone can report a listing or user. Administrators review reports and may suspend accounts, remove content or restrict access. Administrative actions are recorded with the acting administrator and the time.',
  },
  {
    title: 'Changes',
    body: 'We may update these terms as the platform changes. Continued use after an update means you accept the current version.',
  },
];

export default function Terms() {
  return (
    <div className="dm-container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-semibold">Terms of service</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        These are the terms for using {BRAND.name}. They describe what you can expect from us and what we expect
        from you.
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.title} className="dm-card p-6">
            <h2 className="font-display text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        These are demonstration terms for a sample marketplace and are not legal advice. Have them reviewed
        before you rely on them for a live service.
      </p>
    </div>
  );
}