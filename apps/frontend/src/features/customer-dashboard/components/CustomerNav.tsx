import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', to: '/dashboard/customer' },
  { label: 'New Request', to: '/requests/new' },
  { label: 'History', to: '/requests/history' },
  { label: 'Profile', to: '/profile' },
] as const;

export function CustomerNav() {
  return (
    <nav aria-label="Customer navigation" className="customer-nav">
      {NAV_ITEMS.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `customer-nav__item${isActive ? ' customer-nav__item--active' : ''}`
          }
          style={{ minHeight: 44, minWidth: 44 }}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
