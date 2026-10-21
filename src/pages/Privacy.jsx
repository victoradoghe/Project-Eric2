import { BRAND } from '@/lib/constants';

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'Account details you provide (name, email, phone, profile photo and the roles you choose), the listings, enquiries, viewing requests, applications and reports you create, and the saved homes and searches you keep. Uploaded application documents are stored privately and are only readable by you and the landlord you applied to.',
  },
  {
    title: 'What is public',
    body: 'Published listings, agent profiles and agency profiles are public, including the contact details an agent chooses to publish. Draft listings, your enquiries, viewing requests, applications, saved homes, saved searches, notifications and valuation history are private to your account.',
  },
  {
    title: 'Who can read your data',
    body: 'Access is enforced on the server for every record, not by hiding parts of the interface. Enquiries, viewing requests and applications are readable only by the person who created them, the listing owner they were sent to, and administrators handling a report.',
  },
  {
    title: 'Your recent history',
    body: 'The list of homes you recently viewed is kept in your browser on this device. It is not stored in your account and you can clear it from your saved homes page.',
  },
  {
    title: 'Emails we send',
    body: 'Listing and enquiry alerts are sent when you have email notifications switched on, and only to registered account holders. Transactional emails such as address verification and password resets are sent by the platform.',
  },
  {
    title: 'Your choices',
    body: 'You can change your alert frequency and email preference in your profile, remove saved homes, saved searches and notifications at any time, and archive or delete your own listings. To request deletion of your account and its data, contact us.',
  },
  {
    title: 'Retention',
    body: 'We keep records for as long as your account is active and for as long as needed to handle reports and moderation history. Administrative actions are logged with the acting administrator, the record and the time.',
  },
  {
    title: 'What we do not do',
    body: 'We do not sell your personal data, we do not run credit or background checks, and we do not store card numbers or banking credentials because payments are not processed on this platform.',
  },
];

export default function Privacy() {
  return (
    <div className="dm-container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-semibold">Privacy policy</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This policy describes what {BRAND.name} stores, what is public, and who can read what. It is written to
        match how the platform actually behaves.
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
        Questions about your data can be sent from the contact page. This is a demonstration policy for a sample
        marketplace and should be reviewed by a qualified adviser before you rely on it for a live service.
      </p>
    </div>
  );
}