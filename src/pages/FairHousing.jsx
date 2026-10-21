import { Link } from 'react-router-dom';
import { Eye, HandHeart, Scale, ShieldCheck } from 'lucide-react';
import { BRAND } from '@/lib/constants';

const COMMITMENTS = [
  {
    icon: Scale,
    title: 'Equal housing opportunity',
    body: 'Listings, messages and enquiries on Dwellmark must not discriminate on the basis of race, colour, religion, sex, disability, familial status, national origin, or any other characteristic protected by applicable law.',
  },
  {
    icon: HandHeart,
    title: 'Language that welcomes everyone',
    body: 'Listing descriptions and responses should describe the property, not the person you would prefer to live in it. We remove listings whose wording excludes protected groups.',
  },
  {
    icon: Eye,
    title: 'Reasonable accommodation',
    body: 'If a listing owner is asked about reasonable accommodation for a disability, they are expected to respond in line with applicable law. Dwellmark passes those questions through to the listing owner.',
  },
  {
    icon: ShieldCheck,
    title: 'How we enforce it',
    body: 'Anyone can report a listing or a user. Reports go to an administrator, who can remove a listing, suspend an account and record the action in the audit log.',
  },
];

export default function FairHousing() {
  return (
    <div className="dm-container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-semibold">Fair housing</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {BRAND.name} is committed to fair housing. This page explains what that means for the people who list
        homes here and for the people searching for one.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {COMMITMENTS.map((item) => (
          <section key={item.title} className="dm-card p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <item.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-8 dm-card p-6">
        <h2 className="font-display text-lg font-semibold">If you think something here is discriminatory</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Open the listing and use “Report listing”, or send us a message from the contact page describing what
          you saw. Reports are reviewed by an administrator. You can also raise a concern with the fair housing
          or equal opportunity authority that applies where you live.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/contact"
            className="dm-focus rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Report a concern
          </Link>
          <Link
            to="/help"
            className="dm-focus rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-secondary"
          >
            Read the help centre
          </Link>
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        This page is written for a demonstration marketplace and is not legal advice. Confirm your local
        obligations with a qualified adviser before publishing.
      </p>
    </div>
  );
}