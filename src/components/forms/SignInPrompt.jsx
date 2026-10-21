import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';

export default function SignInPrompt({
  title = 'Sign in to continue',
  description = 'Your saved homes, enquiries and requests stay with your account.',
  action,
}) {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  const signInHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
        <LockKeyhole className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to={signInHref}
          className="dm-focus inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Sign in
        </Link>
        <Link
          to={`/register?returnTo=${encodeURIComponent(returnTo)}`}
          className="dm-focus inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary"
        >
          Create an account
        </Link>
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}