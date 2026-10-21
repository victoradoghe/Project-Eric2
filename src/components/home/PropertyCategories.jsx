import { Link } from 'react-router-dom';
import { Building, Building2, Home, Hotel, Trees, Warehouse } from 'lucide-react';
import { PROPERTY_TYPES } from '@/lib/constants';

const ICONS = {
  house: Home,
  apartment: Building2,
  condo: Building,
  townhouse: Warehouse,
  multi_family: Hotel,
  land: Trees,
};

export default function PropertyCategories() {
  return (
    <section className="bg-secondary/60 py-12 sm:py-16">
      <div className="dm-container">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Browse by property type</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Jump straight to the kind of home you have in mind.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PROPERTY_TYPES.map((type) => {
            const Icon = ICONS[type.value] || Home;
            return (
              <Link
                key={type.value}
                to={`/search?property_type=${type.value}`}
                className="dm-card dm-card-hover dm-focus flex flex-col items-center gap-3 p-5 text-center"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{type.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}