import { useState } from 'react';
import { MapPin, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function ZipCodeLocator({ onRelocated }) {
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const submit = async (event) => {
    event.preventDefault();
    const code = postalCode.trim();
    if (!code) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('relocateListings', { postal_code: code });
      const data = response.data || response;
      if (data?.error) {
        toast({ title: 'Could not relocate listings', description: data.error, variant: 'destructive' });
      } else {
        setResult(data);
        toast({
          title: 'Listings relocated',
          description: `${data.relocated_listings} listings moved to ${data.city}, ${data.state} ${data.postal_code}.`,
        });
        if (onRelocated) onRelocated();
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Something went wrong.';
      toast({ title: 'Could not relocate listings', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dm-container py-14">
      <div className="dm-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-border bg-gradient-to-br from-primary to-primary/85 p-8 text-primary-foreground sm:p-10">
            <span className="dm-chip border-white/25 bg-white/10 text-white/85">
              <MapPin className="h-3.5 w-3.5" />
              Listings near you
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              See homes in your area
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
              Enter your postal or zip code and we'll show you listings located right in your
              neighbourhood. The marketplace repositions its available homes to real addresses in your area
              so you can browse what's nearby.
            </p>
          </div>

          <div className="p-8 sm:p-10">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="dm-zip-input" className="dm-label">
                  Your postal or zip code
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-input bg-white px-3">
                  <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <input
                    id="dm-zip-input"
                    type="text"
                    inputMode="postal"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    placeholder="e.g. 75240 or 10001"
                    className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !postalCode.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Relocating listings…
                  </>
                ) : (
                  'Show listings in my area'
                )}
              </Button>
            </form>

            {result ? (
              <div className="mt-5 rounded-xl border border-border bg-accent/40 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">
                      {result.relocated_listings} listings moved to {result.city}, {result.state}{' '}
                      {result.postal_code}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Browse the updated homes below or on the search page.
                    </p>
                    {result.sample_addresses?.length ? (
                      <ul className="mt-3 space-y-1">
                        {result.sample_addresses.map((addr) => (
                          <li key={addr} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {addr}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setResult(null);
                    setPostalCode('');
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try another code
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}