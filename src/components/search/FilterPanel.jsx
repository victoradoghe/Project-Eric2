import { useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { SelectField, SwitchField, TextField } from '@/components/forms/FieldControls';
import { PROPERTY_TYPES } from '@/lib/constants';

const STATUS_SCOPES = [
  { value: 'available', label: 'Available for sale or rent' },
  { value: 'sold', label: 'Sold listings only' },
];

const COUNT_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value}+` }));

const LISTED_WITHIN = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
];

const FURNISHED = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi_furnished', label: 'Semi-furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];

const NUMBER_KEYS = ['price_min', 'price_max', 'area_min', 'area_max', 'lot_min', 'year_min'];

export default function FilterPanel({ filters, onChange, cities = [], onReset }) {
  const [draft, setDraft] = useState({ q: '' });

  useEffect(() => {
    setDraft({
      q: filters.q || '',
      ...Object.fromEntries(NUMBER_KEYS.map((key) => [key, filters[key] ?? ''])),
    });
  }, [filters.q, filters.price_min, filters.price_max, filters.area_min, filters.area_max, filters.lot_min, filters.year_min]);

  const setDraftValue = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));

  // Text and number fields apply once, when the field is left or Enter is pressed,
  // so typing does not fire a request per keystroke.
  const applyDraft = (key) => () => {
    if (String(draft[key] ?? '') !== String(filters[key] ?? '')) {
      onChange({ [key]: draft[key] });
    }
  };

  const applyOnEnter = (key) => (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyDraft(key)();
    }
  };

  const draftProps = (key, label, placeholder) => ({
    id: `filter-${key}`,
    label,
    placeholder,
    value: draft[key] ?? '',
    onChange: setDraftValue(key),
    onBlur: applyDraft(key),
    onKeyDown: applyOnEnter(key),
  });

  const cityOptions = cities.map((city) => ({ value: city, label: city }));

  return (
    <div className="space-y-5">
      <TextField
        {...draftProps('q', 'Location, address or keyword', 'Austin, 78704, garden…')}
        hint="A city name matches that city exactly; other words search the listing text."
      />

      <SelectField
        id="filter-status"
        label="Listing status"
        value={filters.status_scope}
        onChange={(value) => onChange({ status_scope: value || 'available' })}
        options={STATUS_SCOPES}
        emptyLabel="Available for sale or rent"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField type="number" {...draftProps('price_min', 'Minimum price', 'No minimum')} />
        <TextField type="number" {...draftProps('price_max', 'Maximum price', 'No maximum')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="filter-type"
          label="Property type"
          value={filters.property_type}
          onChange={(value) => onChange({ property_type: value })}
          options={PROPERTY_TYPES.map((type) => ({ value: type.value, label: type.label }))}
        />
        <SelectField
          id="filter-city"
          label="City"
          value={filters.city}
          onChange={(value) => onChange({ city: value })}
          options={cityOptions}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="filter-beds"
          label="Bedrooms"
          value={filters.beds_min}
          onChange={(value) => onChange({ beds_min: value })}
          options={COUNT_OPTIONS}
        />
        <SelectField
          id="filter-baths"
          label="Bathrooms"
          value={filters.baths_min}
          onChange={(value) => onChange({ baths_min: value })}
          options={COUNT_OPTIONS}
        />
      </div>

      <Accordion type="multiple" className="rounded-xl border border-border px-3">
        <AccordionItem value="size" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            Size and year built
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField type="number" {...draftProps('area_min', 'Interior (sq ft, min)')} />
              <TextField type="number" {...draftProps('area_max', 'Interior (sq ft, max)')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField type="number" {...draftProps('lot_min', 'Lot size (sq ft, min)')} />
              <TextField type="number" {...draftProps('year_min', 'Built in or after', 'e.g. 2005')} />
            </div>
            <SwitchField
              id="filter-new"
              label="New construction"
              checked={filters.new_construction}
              onChange={(value) => onChange({ new_construction: value })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="features" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            Parking, pets and rental details
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <SwitchField
              id="filter-parking"
              label="Parking or garage"
              checked={filters.parking_ok}
              onChange={(value) => onChange({ parking_ok: value })}
            />
            <SwitchField
              id="filter-pets"
              label="Pets allowed"
              checked={filters.pets_ok}
              onChange={(value) => onChange({ pets_ok: value })}
            />
            <SelectField
              id="filter-furnished"
              label="Furnished status"
              value={filters.furnished}
              onChange={(value) => onChange({ furnished: value })}
              options={FURNISHED}
            />
            <SwitchField
              id="filter-open-house"
              label="Open house scheduled"
              checked={filters.open_house}
              onChange={(value) => onChange({ open_house: value })}
            />
            <SelectField
              id="filter-listed-within"
              label="Listing age"
              value={filters.listed_within}
              onChange={(value) => onChange({ listed_within: value })}
              options={LISTED_WITHIN}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button type="button" variant="secondary" className="w-full" onClick={onReset}>
        Clear all filters
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Text and number fields apply when you press Enter or leave the field; menus and switches apply
        immediately. Feature words such as “pool”, “solar” or “balcony” are searched inside the listing text,
        and every filter you set is kept in the page address so the search can be shared or revisited.
      </p>
    </div>
  );
}