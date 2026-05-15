import { NavLink } from 'react-router-dom';

export function HandymanNav() {
  return (
    <nav className="handyman-nav" aria-label="Handyman navigation">
      <NavLink to="/dashboard/handyman" className="handyman-nav__item">
        Dashboard
      </NavLink>
      <NavLink to="/jobs" className="handyman-nav__item">
        Jobs
      </NavLink>
      <NavLink to="/history/handyman" className="handyman-nav__item">
        History
      </NavLink>
      <NavLink to="/settings/handyman" className="handyman-nav__item">
        Settings
      </NavLink>
    </nav>
  );
}
