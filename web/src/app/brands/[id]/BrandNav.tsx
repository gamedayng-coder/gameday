'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Profile',    segment: 'profile' },
  { label: 'Voice',      segment: 'voice' },
  { label: 'Policies',   segment: 'policies' },
  { label: 'Contacts',   segment: 'contacts' },
] as const;

const KNOWLEDGE_ITEMS = [
  { label: 'Items',      segment: 'knowledge' },
  { label: 'Summaries',  segment: 'knowledge/summaries' },
  { label: 'Templates',  segment: 'knowledge/templates' },
] as const;

const CONTENT_ITEMS = [
  { label: 'All content', segment: 'content' },
  { label: 'Reviews',     segment: 'content/reviews' },
] as const;

const CREATIVE_ITEMS = [
  { label: 'Campaigns',  segment: 'creative' },
  { label: 'Assets',     segment: 'creative/assets' },
  { label: 'Jobs',       segment: 'creative/jobs' },
] as const;

const PUBLISHING_ITEMS = [
  { label: 'Queue',     segment: 'publishing/queue' },
  { label: 'Schedules', segment: 'publishing/schedules' },
  { label: 'Events',    segment: 'events' },
] as const;

const INBOX_ITEMS = [
  { label: 'Enquiries', segment: 'inbox' },
  { label: 'Social',    segment: 'inbox/social' },
] as const;

const CUSTOMERS_ITEMS = [
  { label: 'Customers', segment: 'customers' },
] as const;

const BOOKINGS_ITEMS = [
  { label: 'All bookings', segment: 'bookings' },
  { label: 'Calendar',     segment: 'bookings/calendar' },
] as const;

const NOTIFICATIONS_ITEMS = [
  { label: 'Notifications', segment: 'notifications' },
] as const;

const INVENTORY_ITEMS_NAV = [
  { label: 'Inventory', segment: 'inventory' },
] as const;

const SALES_ITEMS_NAV = [
  { label: 'Sales', segment: 'sales' },
] as const;

const REPORTS_ITEMS_NAV = [
  { label: 'Reports', segment: 'reports' },
] as const;

const DATA_ITEMS_NAV = [
  { label: 'Data Sources', segment: 'data-sources' },
] as const;

const SPORTS_ITEMS_NAV = [
  { label: 'Fixtures',     segment: 'sports/fixtures' },
  { label: 'Standings',    segment: 'sports/standings' },
] as const;

const AUTOMATION_ITEMS_NAV = [
  { label: 'Rules',        segment: 'automation/rules' },
] as const;

const SETTINGS_ITEMS = [
  { label: 'Accounts',    segment: 'settings/accounts' },
  { label: 'Credentials', segment: 'settings/credentials' },
] as const;

interface Props {
  brandId: string;
  sportEnabled?: boolean;
}

export default function BrandNav({ brandId, sportEnabled = false }: Props) {
  const pathname = usePathname();
  const base = `/brands/${brandId}`;

  function isActive(segment: string) {
    const full = `${base}/${segment}`;
    // Knowledge root: active for item pages but not summaries/templates
    if (segment === 'knowledge') {
      return pathname === full || (
        pathname.startsWith(`${full}/`) &&
        !pathname.startsWith(`${base}/knowledge/summaries`) &&
        !pathname.startsWith(`${base}/knowledge/templates`)
      );
    }
    // Content root: active for item pages but not reviews
    if (segment === 'content') {
      return pathname === full || (
        pathname.startsWith(`${full}/`) &&
        !pathname.startsWith(`${base}/content/reviews`)
      );
    }
    // Creative root: active only for campaigns (not assets/jobs sub-pages)
    if (segment === 'creative') {
      return pathname === full || (
        pathname.startsWith(`${full}/`) &&
        !pathname.startsWith(`${base}/creative/assets`) &&
        !pathname.startsWith(`${base}/creative/jobs`)
      );
    }
    // Publishing sub-routes: each matches its own prefix only
    if (segment === 'publishing/queue') {
      return pathname.startsWith(full);
    }
    if (segment === 'publishing/schedules') {
      return pathname.startsWith(full);
    }
    // Inbox root: active for enquiry pages, not social
    if (segment === 'inbox') {
      return pathname === full || (
        pathname.startsWith(`${full}/`) &&
        !pathname.startsWith(`${base}/inbox/social`)
      );
    }
    // Social root: active for interaction detail pages only
    if (segment === 'inbox/social') {
      return pathname.startsWith(full);
    }
    // Bookings root: active for booking detail pages but not calendar sub-route
    if (segment === 'bookings') {
      return pathname === full || (
        pathname.startsWith(`${full}/`) &&
        !pathname.startsWith(`${base}/bookings/calendar`)
      );
    }
    // Bookings calendar: prefix match only
    if (segment === 'bookings/calendar') {
      return pathname.startsWith(full);
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  const linkClass = (segment: string) =>
    `flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
      isActive(segment)
        ? 'bg-slate-700 text-slate-100 font-medium'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/60'
    }`;

  const groupLabel = 'px-3 pt-3 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider';

  return (
    <nav className="w-52 shrink-0 border-r border-slate-700 flex flex-col py-4 px-3 gap-0.5 overflow-y-auto">
      <p className={groupLabel}>Brand</p>
      {NAV_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Knowledge</p>
      {KNOWLEDGE_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Content</p>
      {CONTENT_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Creative</p>
      {CREATIVE_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Publishing</p>
      {PUBLISHING_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Inbox</p>
      {INBOX_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>CRM</p>
      {CUSTOMERS_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Bookings</p>
      {BOOKINGS_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Operations</p>
      {NOTIFICATIONS_ITEMS.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Inventory</p>
      {INVENTORY_ITEMS_NAV.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Sales</p>
      {SALES_ITEMS_NAV.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Reports</p>
      {REPORTS_ITEMS_NAV.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      {sportEnabled && (
        <>
          <p className={`${groupLabel} mt-2`}>Sports</p>
          {SPORTS_ITEMS_NAV.map(({ label, segment }) => (
            <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
              {label}
            </Link>
          ))}
        </>
      )}

      <p className={`${groupLabel} mt-2`}>Automation</p>
      {AUTOMATION_ITEMS_NAV.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <p className={`${groupLabel} mt-2`}>Integrations</p>
      {DATA_ITEMS_NAV.map(({ label, segment }) => (
        <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
          {label}
        </Link>
      ))}

      <div className="mt-auto pt-4 border-t border-slate-700 space-y-0.5">
        <Link href={`${base}/setup`} className={linkClass('setup')}>
          Setup
        </Link>
        {SETTINGS_ITEMS.map(({ label, segment }) => (
          <Link key={segment} href={`${base}/${segment}`} className={linkClass(segment)}>
            {label}
          </Link>
        ))}
        <Link href={`${base}/settings`} className={linkClass('settings')}>
          Settings
        </Link>
        <Link
          href="/admin/observability/errors"
          className="flex items-center px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-colors"
        >
          Observability
        </Link>
      </div>
    </nav>
  );
}
