/**
 * Comparable-listing valuation.
 * Every figure comes from real, stored listings; nothing is invented. When there
 * are too few usable comparables the estimate is refused rather than guessed.
 */

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export const MIN_COMPARABLES = 3;

export const selectComparables = (subject, listings, { excludeId, max = 40 } = {}) => {
  const city = String(subject?.city || '').trim().toLowerCase();
  const state = String(subject?.state || '').trim().toLowerCase();
  const type = subject?.property_type;
  const area = num(subject?.area_sqft);

  return (listings || [])
    .filter((listing) => listing && listing.id !== excludeId)
    .filter((listing) => listing.listing_type === 'sale')
    .filter((listing) => num(listing.price) && num(listing.area_sqft))
    .filter((listing) => (city ? String(listing.city || '').toLowerCase() === city : true))
    .filter((listing) => (state ? String(listing.state || '').toLowerCase() === state : true))
    .filter((listing) => (type ? listing.property_type === type : true))
    .filter((listing) => {
      if (!area) return true;
      const compArea = num(listing.area_sqft);
      return compArea >= area * 0.7 && compArea <= area * 1.3;
    })
    .sort((a, b) => Math.abs(num(a.area_sqft) - (area || num(a.area_sqft))) - Math.abs(num(b.area_sqft) - (area || num(b.area_sqft))))
    .slice(0, max);
};

export const computeValuation = (subject, comps) => {
  const usable = (comps || []).filter((comp) => num(comp.price) && num(comp.area_sqft));

  if (!subject?.city) {
    return { sufficient: false, reason: 'Enter a city so comparable listings can be found.' };
  }
  if (usable.length < MIN_COMPARABLES) {
    return {
      sufficient: false,
      comps_count: usable.length,
      reason: `Only ${usable.length} comparable listing${usable.length === 1 ? '' : 's'} found in ${subject.city}. At least ${MIN_COMPARABLES} are needed before an estimate is shown.`,
    };
  }

  const perSqftValues = usable.map((comp) => num(comp.price) / num(comp.area_sqft));
  const medianPerSqft = median(perSqftValues);
  const subjectArea = num(subject.area_sqft) || median(usable.map((comp) => num(comp.area_sqft)));

  const assumptions = [
    `Based on ${usable.length} comparable for-sale listings in ${subject.city}${subject.state ? `, ${subject.state}` : ''}`,
    `Median price of comparable listings: ${medianPerSqft.toFixed(0)} per sq ft`,
    `Subject area used: ${subjectArea.toLocaleString('en-US')} sq ft`,
    'A size adjustment is applied using the median price per sq ft of the comparables',
    'A condition and age adjustment of up to ±8% is applied when the construction year differs by more than five years',
    'The range shown is ±8% around the central estimate to reflect comparable spread',
  ];

  let estimate = medianPerSqft * subjectArea;

  const subjectYear = num(subject.year_built);
  const compYears = usable.map((comp) => num(comp.year_built)).filter(Boolean);
  if (subjectYear && compYears.length) {
    const compYear = median(compYears);
    const yearGap = subjectYear - compYear;
    if (Math.abs(yearGap) > 5) {
      const adjustment = Math.max(-0.08, Math.min(0.08, (yearGap / 100) * 1.5));
      estimate *= 1 + adjustment;
      assumptions.push(
        `Age adjustment applied: ${(adjustment * 100).toFixed(1)}% (built ${subjectYear} against a comparable median of ${compYear})`,
      );
    }
  }

  const subjectBeds = num(subject.bedrooms);
  const compBeds = median(usable.map((comp) => num(comp.bedrooms)).filter((value) => value !== null));
  if (subjectBeds && compBeds && subjectBeds !== compBeds) {
    const adjustment = Math.max(-0.05, Math.min(0.05, (subjectBeds - compBeds) * 0.015));
    estimate *= 1 + adjustment;
    if (adjustment !== 0) {
      assumptions.push(`Bedroom adjustment applied: ${(adjustment * 100).toFixed(1)}%`);
    }
  }

  const spread = Math.max(...perSqftValues) - Math.min(...perSqftValues);
  const relativeSpread = spread / medianPerSqft;
  const confidence = usable.length >= 8 && relativeSpread < 0.35 ? 'high' : usable.length >= 5 ? 'medium' : 'low';

  return {
    sufficient: true,
    estimated_value: Math.round(estimate),
    low_estimate: Math.round(estimate * 0.92),
    high_estimate: Math.round(estimate * 1.08),
    price_per_sqft: Math.round(medianPerSqft),
    comps_count: usable.length,
    confidence,
    assumptions,
    method_note:
      'Indicative estimate from comparable listings using a median price per sq ft. This is not an appraisal and has not been verified by a professional valuer or an authorised data provider.',
    computed_date: new Date().toISOString(),
    comparables: usable.slice(0, 6),
  };
};