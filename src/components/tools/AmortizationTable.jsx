import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AmortizationTable({ schedule = [] }) {
  const [mode, setMode] = useState('yearly');

  const rows = useMemo(() => {
    if (mode === 'monthly') return schedule;
    const grouped = new Map();
    schedule.forEach((row) => {
      const entry = grouped.get(row.year) || { period: row.year, year: row.year, payment: 0, interest: 0, principal: 0, balance: 0 };
      entry.payment += row.payment;
      entry.interest += row.interest;
      entry.principal += row.principal;
      entry.balance = row.balance;
      grouped.set(row.year, entry);
    });
    return [...grouped.values()];
  }, [schedule, mode]);

  if (!schedule.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
        Enter a loan amount and interest rate to see the schedule.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">Amortisation schedule</h3>
        <div className="flex rounded-lg border border-border p-0.5">
          {[
            { value: 'yearly', label: 'By year' },
            { value: 'monthly', label: 'By month' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              aria-pressed={mode === option.value}
              className={`dm-focus rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-border">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>{mode === 'yearly' ? 'Year' : 'Payment'}</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${mode}-${row.period}`}>
                <TableCell className="font-medium">{row.period}</TableCell>
                <TableCell className="text-right">{money(row.principal)}</TableCell>
                <TableCell className="text-right">{money(row.interest)}</TableCell>
                <TableCell className="text-right">{money(row.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Figures assume a fixed interest rate for the whole term and no extra repayments. Early repayments and
        rate changes would alter this schedule.
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 print:hidden"
        onClick={() => window.print()}
      >
        Print or save as PDF
      </Button>
    </div>
  );
}