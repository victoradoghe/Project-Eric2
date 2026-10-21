import { Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote:
      'We compared eight homes in one evening and had viewings booked for the weekend. Having every enquiry in one place made the whole thing feel calm.',
    name: 'Demonstration testimonial',
    role: 'Renter, sample content',
  },
  {
    quote:
      'Listing our property took about twenty minutes. The inbox made it obvious which enquiries were serious and which viewings were confirmed.',
    name: 'Demonstration testimonial',
    role: 'Owner, sample content',
  },
  {
    quote:
      'The mortgage figures matched what our lender quoted, and the assumptions were written down instead of hidden.',
    name: 'Demonstration testimonial',
    role: 'First-time buyer, sample content',
  },
];

export default function Testimonials() {
  return (
    <section className="dm-container py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">What people say</h2>
        <span className="dm-chip">Demonstration content — not customer quotes</span>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {TESTIMONIALS.map((item, index) => (
          <figure key={index} className="dm-card flex flex-col p-6">
            <Quote className="h-6 w-6 text-primary/40" />
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
              {item.quote}
            </blockquote>
            <figcaption className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.role}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}