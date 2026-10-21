import { Link } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import { BRAND } from '@/lib/constants';
import { WhatsAppIcon, whatsappLink } from '@/components/WhatsAppChat';

const COLUMNS = [
{
  title: 'Explore',
  links: [
  { to: '/search?listing_type=sale', label: 'Homes for sale' },
  { to: '/rent', label: 'Homes for rent' },
  { to: '/search?property_type=land', label: 'Land' },
  { to: '/search?property_type=condo', label: 'Condos' }]

},
{
  title: 'Tools',
  links: [
  { to: '/mortgage', label: 'Mortgage calculator' },
  { to: '/home-values', label: 'Home value estimate' },
  { to: '/agents', label: 'Find an agent' },
  { to: '/agencies', label: 'Agencies' }]

},
{
  title: 'Company',
  links: [
  { to: '/about', label: 'About us' },
  { to: '/contact', label: 'Contact' },
  { to: '/help', label: 'Help centre' },
  { to: '/fair-housing', label: 'Fair housing' }]

},
{
  title: 'Legal',
  links: [
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/terms', label: 'Terms of service' },
  { to: '/fair-housing', label: 'Equal housing opportunity' }]

}];


export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="dm-container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <BrandLogo showTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A marketplace for buying, renting and listing homes — connecting buyers, renters, owners,
              landlords and agents in one place.
            </p>
            <div className="mt-5 space-y-1 text-sm text-muted-foreground">
              
              
              <p>{BRAND.phone}</p>
              <a
                href={whatsappLink(BRAND.phone, `Hello ${BRAND.name}, I have a question about a property.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="dm-focus inline-flex items-center gap-1.5 text-sm font-medium text-[#128C7E] transition hover:text-[#0c6a5e]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          </div>

          {COLUMNS.map((column) =>
          <div key={column.title}>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) =>
              <li key={`${column.title}-${link.to}-${link.label}`}>
                    <Link
                  to={link.to}
                  className="dm-focus rounded text-sm text-muted-foreground transition hover:text-primary">
                  
                      {link.label}
                    </Link>
                  </li>
              )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 space-y-4 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Fair housing: {BRAND.name} does not discriminate on the basis of race, colour, religion, sex,
            disability, familial status or national origin. All listings shown here are demonstration
            content for a fictional address unless clearly marked otherwise. Estimated values and
            calculations on this site are indicative only and are not appraisals, loan approvals or
            financial advice.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {BRAND.name}. An original demonstration marketplace — not
            affiliated with any other property portal.
          </p>
        </div>
      </div>
    </footer>);

}