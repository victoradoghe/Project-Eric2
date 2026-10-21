import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, TrendingUp } from 'lucide-react';

const TOOLS = [
  {
    href: '/mortgage',
    icon: Calculator,
    title: 'Mortgage and affordability tools',
    body: 'Work out monthly payments, total interest and an amortisation schedule, then check what a lender might consider affordable.',
    footnote: 'Estimates only — not a loan approval or financial advice.',
  },
  {
    href: '/home-values',
    icon: TrendingUp,
    title: 'Home value estimates',
    body: 'Compare a property against comparable listings in the same market and see the assumptions behind every figure.',
    footnote: 'Indicative estimates, not professional appraisals.',
  },
];

export default function ToolsIntro() {
  return (
    <section className="bg-secondary/60 py-12 sm:py-16">
      <div className="dm-container">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Plan the money side early</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Transparent calculations, with the assumptions shown next to every number.
        </p>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link key={tool.href} to={tool.href} className="dm-card dm-card-hover dm-focus flex flex-col p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <tool.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold">{tool.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Open the tool
                <ArrowRight className="h-4 w-4" />
              </span>
              <span className="mt-3 text-xs text-muted-foreground">{tool.footnote}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}