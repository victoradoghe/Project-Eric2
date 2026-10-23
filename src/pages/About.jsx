import { Link } from 'react-router-dom';
import { Building2, HeartHandshake, LineChart, Search } from 'lucide-react';
import { BRAND } from '@/lib/constants';
import WhatsAppChat from '@/components/WhatsAppChat';

const PILLARS = [
  {
    icon: Search,
    title: 'One place to search',
    body: 'Buyers and renters search the same listings, with filters that map to the data each listing actually holds.',
  },
  {
    icon: HeartHandshake,
    title: 'Straight to the person responsible',
    body: 'Enquiries, viewing requests and applications go to the owner or landlord behind the listing — never through a call centre.',
  },
  {
    icon: LineChart,
    title: 'Numbers you can check',
    body: 'Mortgage figures and value estimates show their assumptions, and no figure is produced when the data does not support one.',
  },
  {
    icon: Building2,
    title: 'Moderated listings',
    body: 'New listings are reviewed by an administrator before they appear publicly, and anyone can report a problem listing.',
  },
];

export default function About() {
  return (
    <div className="dm-container max-w-4xl py-12">
      <h1 className="font-display text-3xl font-semibold">About {BRAND.name}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {BRAND.name} is an independent property marketplace for buying, renting and listing homes. It brings
        buyers, renters, owners and landlords into one system so that a search, an enquiry and a
        viewing request stay connected instead of scattering across inboxes.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="dm-card p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <pillar.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">{pillar.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-secondary/40 p-6">
        <h2 className="font-display text-lg font-semibold">About the content on this site</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Listings marked as sample content are fictional properties created so the marketplace could be
          tested end to end. They are clearly labelled wherever they appear and an administrator can remove
          them all in one action. Everything else on the site is content published by its own account holder.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Value estimates and mortgage figures are indicative calculations, not appraisals, loan offers or
          financial advice. {BRAND.name} is not affiliated with any other property portal.
        </p>
      </section>

      <WhatsAppChat className="mt-10" />

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/contact"
          className="dm-focus rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Contact us
        </Link>
        <Link
          to="/fair-housing"
          className="dm-focus rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-secondary"
        >
          Fair housing commitment
        </Link>
      </div>
    </div>
  );
}