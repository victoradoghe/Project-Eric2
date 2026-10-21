import ListingCard from '@/components/listing/ListingCard';

export default function SimilarProperties({ listings = [] }) {
  if (!listings.length) {
    return (
      <section className="dm-container py-10">
        <h2 className="font-display text-xl font-semibold">Similar homes</h2>
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
          There are no other matching listings in this area yet.
        </p>
      </section>
    );
  }

  return (
    <section className="dm-container py-10">
      <h2 className="font-display text-xl font-semibold">Similar homes</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Other listings in the same city, sorted by newest.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}