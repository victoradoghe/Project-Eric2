import { Link } from 'react-router-dom';
import { BadgeCheck, Camera, ClipboardList, Eye, Inbox, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: ClipboardList,
    title: '1. Describe the property',
    body: 'Add the address, type, bedrooms, bathrooms, area, features and a description. Save it as a draft and come back whenever you like.',
  },
  {
    icon: Camera,
    title: '2. Add photos',
    body: 'Upload several photos so buyers and renters can see the space. Photos are served straight from your listing.',
  },
  {
    icon: Eye,
    title: '3. Preview and submit',
    body: 'Check the listing exactly as it will appear, then submit it for review.',
  },
  {
    icon: ShieldCheck,
    title: '4. Moderation',
    body: 'An administrator reviews new listings before they go public. You will see the status change on your dashboard, and any rejection comes with a reason.',
  },
  {
    icon: Inbox,
    title: '5. Manage everyone who asks',
    body: 'Enquiries, viewing requests and rental applications land in one inbox with the messages attached.',
  },
];

export default function Sell() {
  return (
    <div>
      <section className="border-b border-border bg-secondary/50">
        <div className="dm-container py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="dm-chip">For owners and landlords</span>
            <h1 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Sell or rent out your property on Dwellmark
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Create a listing yourself in a few minutes. You stay in control of the price, the description and
              who you respond to, and every enquiry is yours — Dwellmark does not act on your behalf.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard/listings/new">Create a listing</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/mortgage">Estimate your costs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="dm-container py-14">
        <h2 className="font-display text-2xl font-semibold">How publishing works</h2>
        <div className="mt-7 grid gap-5 lg:grid-cols-5">
          {STEPS.map((step) => (
            <div key={step.title} className="dm-card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <step.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-14">
        <div className="dm-container grid gap-8 lg:grid-cols-2">
          <div className="dm-card p-7">
            <h2 className="font-display text-xl font-semibold">What Dwellmark does not do</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>• We do not take a commission for a sale or a let, and we do not handle deposits or rent.</li>
              <li>• We do not run credit checks, background checks or electronic signatures.</li>
              <li>• We do not verify ownership automatically. A listing shows a verification badge only after an administrator has checked it.</li>
              <li>• We do not guarantee a buyer, a tenant or a sale price.</li>
            </ul>
          </div>
          <div className="dm-card p-7">
            <h2 className="font-display text-xl font-semibold">Getting the listing status right</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ['Draft', 'Only you can see it.'],
                ['Pending review', 'Submitted and waiting for an administrator.'],
                ['Published', 'Live in search results and public pages.'],
                ['Under offer', 'Still visible, marked as under offer.'],
                ['Sold', 'Kept for reference and shown in sold searches.'],
                ['Rejected', 'Not published — the reason is shown to you.'],
                ['Archived', 'Removed from search but kept on your dashboard.'],
              ].map(([status, meaning]) => (
                <div key={status} className="flex gap-3">
                  <dt className="w-32 shrink-0 font-semibold">{status}</dt>
                  <dd className="text-muted-foreground">{meaning}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Listing moderation, ownership verification and valuation estimates are three
              separate things. Dwellmark never presents one as another.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}