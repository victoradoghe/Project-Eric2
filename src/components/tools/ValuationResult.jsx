import { Info, TrendingUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ListingCard from '@/components/listing/ListingCard';
import { formatDate } from '@/lib/format';

const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function ValuationResult({ result }) {
  if (!result) return null;

  if (!result.sufficient) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6">
        <p className="font-semibold">No estimate available</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.reason}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Dwellmark only shows a figure when enough comparable listings exist to support it. It never
          invents a value, a market trend or a historical price.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="dm-card p-6">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          Indicative estimate
        </p>
        <p className="mt-2 font-display text-4xl font-semibold">{money(result.estimated_value)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Range {money(result.low_estimate)} – {money(result.high_estimate)} · {money(result.price_per_sqft)} per
          sq ft · based on {result.comps_count} comparable listings
        </p>

        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            {result.method_note}
          </span>
        </div>

        <Accordion type="single" collapsible className="mt-4 rounded-xl border border-border px-4">
          <AccordionItem value="assumptions" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              Assumptions and date of calculation
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                {result.assumptions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
                <li>• Calculated on {formatDate(result.computed_date)}</li>
                <li>• Confidence level: {result.confidence}</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {result.comparables?.length ? (
        <div>
          <h3 className="font-display text-lg font-semibold">Comparable listings used</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            These are the actual listings behind the estimate. Asking prices are shown as listed.
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.comparables.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}