import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SAMPLE_LISTINGS, HERO_IMAGE } from '@/lib/sampleListings';
import { cn } from '@/lib/utils';

const TABS = [
  { value: 'sale', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'sold', label: 'Sold' },
];

export default function HeroSearch() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('sale');
  const [query, setQuery] = useState('');

  const suggestions = [
    ...new Set(
      SAMPLE_LISTINGS.flatMap((listing) => [
        `${listing.city}, ${listing.state}`,
        [listing.neighborhood, listing.city].filter(Boolean).join(', '),
        listing.postal_code,
      ]),
    ),
  ]
    .filter(Boolean)
    .sort();

  const submit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    params.set('listing_type', tab);
    if (tab === 'sold') params.set('status', 'sold');
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt="Contemporary home exterior at dusk"
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/65 to-slate-900/35" />
      </div>

      <div className="dm-container relative py-16 sm:py-24 lg:py-28">
        <div className="max-w-2xl dm-fade-up">
          <h1 className="font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-[3.4rem]">
            Find the place that fits your life
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">
            Search verified-style listings, compare neighbourhoods, and talk directly to the owners and
            landlords behind each home.
          </p>
        </div>

        <div className="mt-8 max-w-3xl dm-fade-up">
          <div className="flex gap-1 rounded-t-2xl bg-white/10 p-1 backdrop-blur sm:w-fit">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-pressed={tab === item.value}
                className={cn(
                  'dm-focus rounded-xl px-4 py-2 text-sm font-semibold transition',
                  tab === item.value
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={submit}
            className="flex flex-col gap-2 rounded-b-2xl rounded-tr-2xl bg-white p-3 shadow-2xl sm:flex-row sm:items-center"
          >
            <div className="flex flex-1 items-center gap-2 px-2">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                list="dm-place-suggestions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="City, neighbourhood, address or postal code"
                aria-label="Search by city, neighbourhood, address or postal code"
                className="h-11 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <datalist id="dm-place-suggestions">
                {suggestions.slice(0, 40).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <button
              type="submit"
              className="dm-focus h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuery(item)}
                className="dm-focus rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur transition hover:bg-white/20"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}