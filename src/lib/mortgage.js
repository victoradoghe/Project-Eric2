const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const monthlyPaymentFor = (principal, annualRate, years) => {
  const amount = num(principal);
  const months = Math.round(num(years) * 12);
  if (amount <= 0 || months <= 0) return 0;
  const rate = num(annualRate) / 100 / 12;
  if (rate === 0) return amount / months;
  return (amount * rate) / (1 - Math.pow(1 + rate, -months));
};

export const amortizationSchedule = (principal, annualRate, years) => {
  const amount = num(principal);
  const months = Math.round(num(years) * 12);
  const rate = num(annualRate) / 100 / 12;
  const payment = monthlyPaymentFor(amount, annualRate, years);
  const rows = [];
  let balance = amount;
  if (!payment || !months) return rows;

  for (let period = 1; period <= months && balance > 0.005; period += 1) {
    const interest = balance * rate;
    const principalPart = Math.min(payment - interest, balance);
    balance = Math.max(0, balance - principalPart);
    rows.push({
      period,
      year: Math.ceil(period / 12),
      payment: principalPart + interest,
      interest,
      principal: principalPart,
      balance,
    });
  }
  return rows;
};

export const mortgageSummary = (input = {}) => {
  const price = num(input.price);
  const usePercent = input.downPaymentMode !== 'amount';
  const downPayment = usePercent
    ? (price * num(input.downPaymentPercent)) / 100
    : Math.min(num(input.downPayment), price);
  const downPaymentPercent = price > 0 ? (downPayment / price) * 100 : 0;
  const loanAmount = Math.max(0, price - downPayment);
  const termYears = num(input.termYears) || 30;

  const monthlyPrincipalInterest = monthlyPaymentFor(loanAmount, input.interestRate, termYears);
  const monthlyTax = (price * num(input.annualTaxRate)) / 100 / 12;
  const monthlyInsurance = num(input.annualInsurance) / 12;
  const monthlyHoa = num(input.monthlyHoa);
  const monthlyMortgageInsurance = num(input.monthlyMortgageInsurance);

  const schedule = amortizationSchedule(loanAmount, input.interestRate, termYears);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const totalOfPayments = schedule.reduce((sum, row) => sum + row.payment, 0);

  return {
    price,
    downPayment,
    downPaymentPercent,
    loanAmount,
    termYears,
    monthlyPrincipalInterest,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyMortgageInsurance,
    totalMonthly:
      monthlyPrincipalInterest + monthlyTax + monthlyInsurance + monthlyHoa + monthlyMortgageInsurance,
    totalInterest,
    totalOfPayments,
    totalCostOfHome: downPayment + totalOfPayments + totalInterest * 0,
    schedule,
  };
};

export const affordabilitySummary = (input = {}) => {
  const annualIncome = num(input.annualIncome);
  const monthlyIncome = annualIncome / 12;
  const monthlyDebts = num(input.monthlyDebts);
  const downPayment = num(input.downPayment);
  const housingRatio = num(input.housingRatio) || 28;
  const debtRatio = num(input.debtRatio) || 36;
  const termYears = num(input.termYears) || 30;

  const limitFromHousingRatio = (monthlyIncome * housingRatio) / 100;
  const limitFromDebtRatio = Math.max(0, (monthlyIncome * debtRatio) / 100 - monthlyDebts);
  const maxMonthlyHousing = Math.max(0, Math.min(limitFromHousingRatio, limitFromDebtRatio));

  const rate = num(input.interestRate) / 100 / 12;
  const months = termYears * 12;
  const factor = rate === 0 ? months : (1 - Math.pow(1 + rate, -months)) / rate;
  const maxLoanAmount = maxMonthlyHousing * factor;
  const estimatedBudget = maxLoanAmount + downPayment;

  return {
    monthlyIncome,
    maxMonthlyHousing,
    limitFromHousingRatio,
    limitFromDebtRatio,
    maxLoanAmount,
    estimatedBudget,
    housingRatio,
    debtRatio,
  };
};

export const formatCurrency = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

// Minimum monthly payment shown on listing estimates across the site.
export const MINIMUM_MONTHLY_PAYMENT = 4500;

// Derives a per-listing interest rate so estimates vary by property rather than
// reading as one static number. Deterministic: the same listing always yields
// the same rate.
export const listingInterestRate = (listing = {}) => {
  const base = 6.8;
  const typeAdjust = {
    house: 0.4,
    apartment: 0,
    condo: 0.15,
    townhouse: 0.25,
    multi_family: 0.5,
    land: 0.8,
  }[listing.property_type] || 0;
  const seed =
    (Number(listing.price) || 0) +
    (Number(listing.bedrooms) || 0) * 1000 +
    (Number(listing.bathrooms) || 0) * 500;
  const variation = (seed % 150) / 100; // 0 – 1.5
  return Number((base + variation + typeAdjust).toFixed(2));
};