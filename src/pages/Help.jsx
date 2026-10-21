import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const FAQS = [
  {
    q: 'How do I save a home?',
    a: 'Use the heart on any listing card or on the listing page. Saving requires an account so your collection stays with you between visits.',
  },
  {
    q: 'What does a saved search do?',
    a: 'It stores the filters you used and the address of the results page. When a new listing is published that matches those filters, Dwellmark adds an in-app notification for you, and emails you if you have email alerts switched on and instant frequency selected.',
  },
  {
    q: 'Do notifications run on a schedule?',
    a: 'Matching runs when a listing is published or approved. Instant alerts are delivered at that moment; the daily and weekly preferences are stored on your account and applied to the alerts you receive.',
  },
  {
    q: 'How do I contact a listing owner?',
    a: 'Sign in and use the contact form on the listing. Your message is stored against the listing and only the owner, landlord or agent behind it can read it.',
  },
  {
    q: 'Is a viewing confirmed automatically?',
    a: 'No. A viewing request stays pending until the listing owner confirms or declines it. You can follow the status in your dashboard.',
  },
  {
    q: 'Why is my listing not visible yet?',
    a: 'New listings go to an administrator for review before they appear publicly. Your dashboard shows whether a listing is a draft, pending review, published or rejected — with a reason if it was rejected.',
  },
  {
    q: 'What do the value estimates mean?',
    a: 'They are indicative figures calculated from comparable listings in the same market, using a median price per square foot with transparent adjustments. They are not appraisals and Dwellmark is not connected to an external valuation provider.',
  },
  {
    q: 'Can I pay rent or a deposit here?',
    a: 'No. Dwellmark does not process payments, hold deposits, run credit checks or produce electronic signatures, and it does not claim to.',
  },
  {
    q: 'How do I report a listing?',
    a: 'Open the listing and choose “Report listing”. Choose a reason and add any detail that helps. Reports go to the moderation queue for an administrator.',
  },
  {
    q: 'How do I delete my data?',
    a: 'You can remove your saved homes, searches, listings and notifications from your account at any time. For a full deletion request, send us a message from the contact page.',
  },
];

export default function Help() {
  return (
    <div className="dm-container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-semibold">Help centre</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Answers to the questions people ask most often about searching, saving, listing and getting in touch.
      </p>

      <Accordion type="single" collapsible className="mt-8">
        {FAQS.map((item, index) => (
          <AccordionItem key={item.q} value={`item-${index}`}>
            <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">{item.q}</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-10 rounded-2xl border border-border bg-secondary/40 p-6">
        <h2 className="font-display text-lg font-semibold">Still stuck?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Send us a message and describe what you were trying to do. Including the listing address or the
          search you ran helps us answer in one reply.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/contact">Contact support</Link>
        </Button>
      </div>
    </div>
  );
}