import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Globe, Mail, MapPin, Phone, ShieldQuestion, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import ListingCard from '@/components/listing/ListingCard';
import SignInPrompt from '@/components/forms/SignInPrompt';
import { formatDate } from '@/lib/format';
import { publicClause } from '@/lib/listingsApi';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          aria-label={`${score} star${score === 1 ? '' : 's'}`}
          className="dm-focus rounded p-0.5"
        >
          <Star className={`h-5 w-5 ${score <= value ? 'fill-amber-400 text-amber-400' : 'text-border'}`} />
        </button>
      ))}
    </div>
  );
}

export default function AgentProfile() {
  const { id } = useParams();
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [agent, setAgent] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const page = await base44.entities.Review.filter({ agent_profile_id: id }, { sort: '-created_date', limit: 20 });
      setReviews(page?.items || []);
    } catch (err) {
      setReviews([]);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.entities.AgentProfile.get(id)
      .then(async (record) => {
        if (!active) return;
        setAgent(record);
        try {
          const page = await base44.entities.Listing.filter(
            { agent_id: record.user_id, ...publicClause() },
            { sort: '-published_date', limit: 6 },
          );
          if (active) setListings(page?.items || []);
        } catch (err) {
          if (active) setListings([]);
        }
      })
      .catch((err) => {
        if (active) setError(err?.message || 'This profile could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    loadReviews();
    return () => {
      active = false;
    };
  }, [id, loadReviews]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await base44.entities.Review.create({
        agent_profile_id: id,
        agent_user_id: agent?.user_id,
        reviewer_id: user.id,
        reviewer_name: user.full_name || user.email,
        rating,
        comment,
      });
      setComment('');
      toast({ title: 'Review published', description: 'Thank you — your review is now visible.' });
      loadReviews();
    } catch (err) {
      toast({ title: 'Could not publish the review', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dm-container space-y-5 py-10">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="dm-container py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Agent not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-5" asChild>
          <Link to="/agents">Browse all agents</Link>
        </Button>
      </div>
    );
  }

  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : null;
  const verified = agent.verification_status === 'verified';

  return (
    <div className="dm-container py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="dm-card p-6">
            <div className="flex flex-wrap items-start gap-5">
              <span className="grid h-20 w-20 overflow-hidden rounded-3xl bg-secondary">
                {agent.photo_url ? (
                  <img src={agent.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center font-display text-2xl text-muted-foreground">
                    {(agent.display_name || '?').slice(0, 1)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold">{agent.display_name}</h1>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      verified ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <ShieldQuestion className="h-3.5 w-3.5" />}
                    {verified ? 'Verified by Dwellmark' : 'Not verified'}
                  </span>
                  {agent.is_demo ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Sample profile
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {agent.agency_name || 'Independent agent'}
                  {agent.years_experience ? ` · ${agent.years_experience} years of experience` : ''}
                </p>
                {average ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {average.toFixed(1)} average from {reviews.length} review{reviews.length === 1 ? '' : 's'}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No reviews yet</p>
                )}
              </div>
            </div>

            {agent.bio ? <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{agent.bio}</p> : null}

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {agent.phone ? (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span>{agent.phone}</span>
                </div>
              ) : null}
              {agent.email ? (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{agent.email}</span>
                </div>
              ) : null}
              {agent.website ? (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{agent.website}</span>
                </div>
              ) : null}
              {agent.service_areas?.length ? (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{agent.service_areas.join(', ')}</span>
                </div>
              ) : null}
            </dl>

            {agent.specialties?.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {agent.specialties.map((item) => (
                  <span key={item} className="dm-chip">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            {verified && agent.license_number ? (
              <p className="mt-5 rounded-xl bg-primary/5 p-4 text-xs leading-relaxed text-primary">
                Licence {agent.license_number}
                {agent.license_state ? ` (${agent.license_state})` : ''} — reviewed and confirmed by a Dwellmark
                administrator.
              </p>
            ) : (
              <p className="mt-5 rounded-xl bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">
                Licence details and experience shown here were supplied by the agent and have not been
                independently checked. Contact details above are the agent's published business details.
              </p>
            )}
          </div>

          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold">Listings by this agent</h2>
            {listings.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
                No published listings from this agent yet.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="dm-card p-6">
            <h2 className="font-display text-lg font-semibold">Reviews</h2>
            {reviews.length ? (
              <ul className="mt-4 space-y-4">
                {reviews.map((review) => (
                  <li key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-3.5 w-3.5 ${
                            index < Number(review.rating) ? 'fill-amber-400 text-amber-400' : 'text-border'
                          }`}
                        />
                      ))}
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
                    ) : null}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {review.reviewer_name || 'A Dwellmark user'} · {formatDate(review.created_date)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">This agent has not been reviewed yet.</p>
            )}

            <div className="mt-6 border-t border-border pt-5">
              {user?.id ? (
                <form onSubmit={submitReview} className="space-y-3">
                  <Label className="dm-label">Leave a review</Label>
                  <StarPicker value={rating} onChange={setRating} />
                  <Textarea
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Describe your experience working with this agent."
                  />
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Publishing…' : 'Publish review'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Reviews are user supplied. Dwellmark does not verify that a transaction took place.
                  </p>
                </form>
              ) : (
                <SignInPrompt title="Sign in to review this agent" description="Reviews are tied to an account." />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}