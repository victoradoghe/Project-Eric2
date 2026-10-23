import { BellRing, CalendarCheck, MessageSquareText, Search } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'Search with real filters',
    body: 'Narrow results by price, property type, bedrooms, area, year built, amenities, pet policy and more — then keep the search in a link you can share.',
  },
  {
    icon: BellRing,
    title: 'Save homes and searches',
    body: 'Collect the homes you like, save the filters behind them, and get notified in the app when new listings match or a price changes.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask the person behind the listing',
    body: 'Send an enquiry straight to the owner or landlord. Every conversation stays private between the two of you.',
  },
  {
    icon: CalendarCheck,
    title: 'Request a viewing',
    body: 'Pick a date and time that suits you. Requests stay pending until the listing owner confirms them.',
  },
];

export default function HowItWorks() {
  return (
    <section className="dm-container py-12 sm:py-16">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          How Dwellmark helps buyers and renters
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Everything you need to move from browsing to a confirmed viewing, without losing track of the
          homes you care about.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div key={step.title} className="dm-card p-6">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <step.icon className="h-5 w-5" />
              </span>
              <span className="font-display text-2xl text-border">0{index + 1}</span>
            </div>
            <h3 className="mt-4 font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}