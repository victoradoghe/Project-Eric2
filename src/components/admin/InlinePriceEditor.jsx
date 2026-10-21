import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminUpdateListingPrice } from '@/lib/adminActions';
import { useAuth } from '@/lib/AuthContext';
import { currencySymbol } from '@/lib/format';

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'NGN', label: 'NGN' },
];

export default function InlinePriceEditor({ listing, onSaved, displayClassName = 'font-semibold' }) {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(listing?.price ?? '');
  const [currency, setCurrency] = useState(listing?.currency || 'USD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setPrice(listing?.price ?? '');
      setCurrency(listing?.currency || 'USD');
    }
  }, [editing, listing]);

  const save = async () => {
    if (price === '' || price === null || Number.isNaN(Number(price))) {
      toast({ title: 'Enter a valid price', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updated = await adminUpdateListingPrice(user, listing, price, currency);
      toast({ title: 'Price updated' });
      setEditing(false);
      onSaved?.(updated);
    } catch (error) {
      toast({ title: 'Could not update the price', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition hover:bg-accent"
        title="Edit price"
      >
        <span className={`${displayClassName} underline-offset-2 group-hover:underline`}>{formatAmount(listing)}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground group-hover:text-accent-foreground">
          Edit
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="0"
          step="any"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="h-8 w-32"
          disabled={saving}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              save();
            } else if (event.key === 'Escape') {
              setEditing(false);
            }
          }}
        />
        <Select value={currency} onValueChange={setCurrency} disabled={saving}>
          <SelectTrigger className="h-8 w-24" aria-label="Currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(CURRENCIES || []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" className="h-8 w-8" onClick={save} disabled={saving} title="Save price">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setEditing(false)}
          disabled={saving}
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function formatAmount(listing) {
  if (listing?.price == null) return '—';
  return `${currencySymbol(listing.currency)}${Number(listing.price).toLocaleString()}`;
}