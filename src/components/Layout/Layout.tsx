import { Outlet } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../routes'
import './Layout.css'

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <NavLink to={ROUTES.HOME} className="layout__brand">
          TuniWay Connect
        </NavLink>
        <nav className="layout__nav">
          <NavLink
            to={ROUTES.HOME}
            className={({ isActive }) =>
              `layout__link ${isActive ? 'layout__link--active' : ''}`
            }
            end
          >
            Home
          </NavLink>
          <NavLink
            to={ROUTES.EXAMPLE}
            className={({ isActive }) =>
              `layout__link ${isActive ? 'layout__link--active' : ''}`
            }
          >
            Example
          </NavLink>
        </nav>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}
