import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Calculator, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AmortizationTable from '@/components/tools/AmortizationTable';
import { AFFORDABILITY_DEFAULTS, MORTGAGE_DEFAULTS } from '@/lib/constants';
import { affordabilitySummary, mortgageSummary } from '@/lib/mortgage';

const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const money2 = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Mortgage() {
  const [params] = useSearchParams();
  const [mortgage, setMortgage] = useState({
    price: params.get('price') || 600000,
    downPaymentMode: 'percent',
    downPaymentPercent: MORTGAGE_DEFAULTS.downPaymentPercent,
    downPayment: 60000,
    interestRate: MORTGAGE_DEFAULTS.interestRate,
    termYears: MORTGAGE_DEFAULTS.termYears,
    annualTaxRate: MORTGAGE_DEFAULTS.annualTaxRate,
    annualInsurance: MORTGAGE_DEFAULTS.annualInsurance,
    monthlyHoa: MORTGAGE_DEFAULTS.monthlyHoa,
    monthlyMortgageInsurance: MORTGAGE_DEFAULTS.monthlyMortgageInsurance,
  });
  const [affordability, setAffordability] = useState({ ...AFFORDABILITY_DEFAULTS });

  useEffect(() => {
    const price = params.get('price');
    if (price) setMortgage((current) => ({ ...current, price }));
  }, [params]);

  const summary = useMemo(() => mortgageSummary(mortgage), [mortgage]);
  const budget = useMemo(() => affordabilitySummary(affordability), [affordability]);

  const setM = (key) => (value) => setMortgage((current) => ({ ...current, [key]: value }));
  const setA = (key) => (value) => setAffordability((current) => ({ ...current, [key]: value }));

  return (
    <div className="dm-container py-10">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">Mortgage and affordability tools</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Work out what a home would cost each month, what the loan costs over its full term, and what a
          lender might consider affordable. Every figure is calculated from the values you enter.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          These are estimates for planning only. They are not a loan offer, an approval, or financial advice.
          Dwellmark does not connect to live mortgage rates — the interest rate is the one you type in.
        </span>
      </div>

      <Tabs defaultValue="mortgage" className="mt-8">
        <TabsList>
          <TabsTrigger value="mortgage">
            <Calculator className="mr-1.5 h-4 w-4" />
            Mortgage calculator
          </TabsTrigger>
          <TabsTrigger value="affordability">
            <Wallet className="mr-1.5 h-4 w-4" />
            Affordability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mortgage" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="dm-card space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Loan details</h2>
              <div>
                <Label htmlFor="m-price" className="dm-label">
                  Property price
                </Label>
                <Input id="m-price" type="number" value={mortgage.price} onChange={(event) => setM('price')(event.target.value)} />
              </div>

              <div>
                <Label htmlFor="m-mode" className="dm-label">
                  Down payment entered as
                </Label>
                <select
                  id="m-mode"
                  value={mortgage.downPaymentMode}
                  onChange={(event) => setM('downPaymentMode')(event.target.value)}
                  className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="percent">Percentage</option>
                  <option value="amount">Amount</option>
                </select>
              </div>

              {mortgage.downPaymentMode === 'percent' ? (
                <div>
                  <Label htmlFor="m-down-percent" className="dm-label">
                    Down payment (%)
                  </Label>
                  <Input
                    id="m-down-percent"
                    type="number"
                    value={mortgage.downPaymentPercent}
                    onChange={(event) => setM('downPaymentPercent')(event.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="m-down" className="dm-label">
                    Down payment amount
                  </Label>
                  <Input id="m-down" type="number" value={mortgage.downPayment} onChange={(event) => setM('downPayment')(event.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="m-rate" className="dm-label">
                    Interest rate (%)
                  </Label>
                  <Input
                    id="m-rate"
                    type="number"
                    step="0.01"
                    value={mortgage.interestRate}
                    onChange={(event) => setM('interestRate')(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="m-term" className="dm-label">
                    Term (years)
                  </Label>
                  <Input id="m-term" type="number" value={mortgage.termYears} onChange={(event) => setM('termYears')(event.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="m-tax" className="dm-label">
                    Property tax (% a year)
                  </Label>
                  <Input
                    id="m-tax"
                    type="number"
                    step="0.01"
                    value={mortgage.annualTaxRate}
                    onChange={(event) => setM('annualTaxRate')(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="m-insurance" className="dm-label">
                    Insurance a year
                  </Label>
                  <Input
                    id="m-insurance"
                    type="number"
                    value={mortgage.annualInsurance}
                    onChange={(event) => setM('annualInsurance')(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="m-hoa" className="dm-label">
                    HOA a month
                  </Label>
                  <Input id="m-hoa" type="number" value={mortgage.monthlyHoa} onChange={(event) => setM('monthlyHoa')(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="m-mi" className="dm-label">
                    Mortgage insurance a month
                  </Label>
                  <Input
                    id="m-mi"
                    type="number"
                    value={mortgage.monthlyMortgageInsurance}
                    onChange={(event) => setM('monthlyMortgageInsurance')(event.target.value)}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setMortgage((current) => ({ ...current, ...MORTGAGE_DEFAULTS, price: current.price, downPaymentMode: current.downPaymentMode, downPayment: current.downPayment }))}
              >
                Reset to default assumptions
              </Button>
            </div>

            <div className="space-y-6">
              <div className="dm-card p-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total estimated monthly payment</p>
                <p className="mt-1 font-display text-4xl font-semibold">{money2(summary.totalMonthly)}</p>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-secondary/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Loan principal</dt>
                    <dd className="mt-1 font-semibold">{money(summary.loanAmount)}</dd>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Down payment</dt>
                    <dd className="mt-1 font-semibold">
                      {money(summary.downPayment)} ({summary.downPaymentPercent.toFixed(1)}%)
                    </dd>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Principal and interest</dt>
                    <dd className="mt-1 font-semibold">{money2(summary.monthlyPrincipalInterest)}</dd>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Taxes and insurance</dt>
                    <dd className="mt-1 font-semibold">{money2(summary.monthlyTax + summary.monthlyInsurance)}</dd>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">HOA and mortgage insurance</dt>
                    <dd className="mt-1 font-semibold">
                      {money2(summary.monthlyHoa + summary.monthlyMortgageInsurance)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Total interest over the term</dt>
                    <dd className="mt-1 font-semibold">{money(summary.totalInterest)}</dd>
                  </div>
                </dl>

                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                  Calculated with the standard fixed-rate formula on a principal of {money(summary.loanAmount)} at{' '}
                  {mortgage.interestRate}% over {summary.termYears} years. A zero interest rate is handled as
                  principal divided by the number of payments.
                </p>
              </div>

              <div className="dm-card p-6">
                <AmortizationTable schedule={summary.schedule} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="affordability" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="dm-card space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Your finances</h2>
              <div>
                <Label htmlFor="a-income" className="dm-label">
                  Annual income
                </Label>
                <Input
                  id="a-income"
                  type="number"
                  value={affordability.annualIncome}
                  onChange={(event) => setA('annualIncome')(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="a-debts" className="dm-label">
                  Monthly debt payments
                </Label>
                <Input id="a-debts" type="number" value={affordability.monthlyDebts} onChange={(event) => setA('monthlyDebts')(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="a-down" className="dm-label">
                  Down payment available
                </Label>
                <Input id="a-down" type="number" value={affordability.downPayment} onChange={(event) => setA('downPayment')(event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="a-rate" className="dm-label">
                    Interest rate (%)
                  </Label>
                  <Input
                    id="a-rate"
                    type="number"
                    step="0.01"
                    value={affordability.interestRate}
                    onChange={(event) => setA('interestRate')(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="a-term" className="dm-label">
                    Term (years)
                  </Label>
                  <Input id="a-term" type="number" value={affordability.termYears} onChange={(event) => setA('termYears')(event.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="a-housing" className="dm-label">
                    Housing ratio (%)
                  </Label>
                  <Input
                    id="a-housing"
                    type="number"
                    value={affordability.housingRatio}
                    onChange={(event) => setA('housingRatio')(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="a-debt-ratio" className="dm-label">
                    Total debt ratio (%)
                  </Label>
                  <Input
                    id="a-debt-ratio"
                    type="number"
                    value={affordability.debtRatio}
                    onChange={(event) => setA('debtRatio')(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="dm-card p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated buying budget</p>
              <p className="mt-1 font-display text-4xl font-semibold">{money(budget.estimatedBudget)}</p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Monthly income</dt>
                  <dd className="mt-1 font-semibold">{money(budget.monthlyIncome)}</dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Housing payment used</dt>
                  <dd className="mt-1 font-semibold">{money(budget.maxMonthlyHousing)}</dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Limit from housing ratio ({budget.housingRatio}%)
                  </dt>
                  <dd className="mt-1 font-semibold">{money(budget.limitFromHousingRatio)}</dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Limit after other debts ({budget.debtRatio}%)
                  </dt>
                  <dd className="mt-1 font-semibold">{money(budget.limitFromDebtRatio)}</dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Loan this supports</dt>
                  <dd className="mt-1 font-semibold">{money(budget.maxLoanAmount)}</dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Plus your down payment</dt>
                  <dd className="mt-1 font-semibold">{money(affordability.downPayment)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Lenders apply their own criteria — credit history, employment, existing commitments and local
                rules all affect what you are offered. The housing and debt ratios here are assumptions you can
                change, not lender policy.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}