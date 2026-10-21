import { useState } from 'react';
import { Bitcoin, Copy, ExternalLink, ShieldAlert, Wallet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PAYMENT } from '@/lib/constants';
import { formatPrice } from '@/lib/format';

const STEPS = [
  {
    title: 'Sign in to PayPal',
    body: 'Log in to your eligible U.S. PayPal account.',
  },
  {
    title: 'Buy Bitcoin (BTC)',
    body: 'Open the Crypto section, select Bitcoin, enter your amount, and confirm your purchase.',
  },
  {
    title: 'Select Send',
    body: 'Open your Bitcoin balance and choose the option to send crypto to an external wallet.',
  },
  {
    title: "Enter the recipient's address",
    body: 'Send to the Bitcoin wallet address shown below.',
  },
  {
    title: 'Confirm the payment',
    body: 'Verify the address, Bitcoin network, amount, and fees before sending.',
  },
  {
    title: 'Verify receipt',
    body: 'Save the transaction ID and check the transaction status.',
  },
];

export default function PayPalPaymentDialog({ listing, open, onOpenChange }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const proceedToPayment = () => {
    // Opens the PayPal app on mobile (universal link) or the PayPal website on desktop.
    window.open('https://www.paypal.com/', '_blank', 'noopener,noreferrer');
    onOpenChange?.(false);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT.bitcoinWallet);
      setCopied(true);
      toast({ title: 'Wallet address copied' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: 'Copy failed', description: PAYMENT.bitcoinWallet, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Pay with PayPal via Bitcoin
          </DialogTitle>
          <DialogDescription>
            Follow these steps to complete your {listing?.listing_type === 'rent' ? 'rental' : 'purchase'} payment
            {listing ? ` of ${formatPrice(listing)}` : ''} using PayPal.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="pt-0.5">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                {index === 3 ? (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-secondary/60 p-3">
                    <Bitcoin className="h-4 w-4 shrink-0 text-primary" />
                    <code className="flex-1 break-all text-xs font-medium">{PAYMENT.bitcoinWallet}</code>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="dm-focus inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold transition hover:bg-secondary"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="sm:flex-1"
            onClick={copyAddress}
          >
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Address copied' : 'Copy wallet address'}
          </Button>
          <Button type="button" className="sm:flex-1" onClick={proceedToPayment}>
            Proceed
          </Button>
        </div>

        <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            Important
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-900/80">
            PayPal crypto transfers require an eligible account. Bitcoin transactions are generally
            irreversible, so double-check the wallet address before sending.
          </p>
        </div>

        <a
          href={PAYMENT.paypalGuideUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View PayPal's official transfer guide
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Dwellmark does not process or hold payments. Arrange and confirm the transfer directly with the
          listing owner, and keep your transaction ID as proof of payment.
        </p>
      </DialogContent>
    </Dialog>
  );
}