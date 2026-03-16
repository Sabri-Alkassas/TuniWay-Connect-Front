import { Link } from 'react-router-dom'
import { ROUTES } from '../../routes'
import './NotFoundPage.css'

export function NotFoundPage() {
  return (
    <div className="not-found">
      <h1 className="not-found__title">404</h1>
      <p className="not-found__text">This page doesn’t exist.</p>
      <Link to={ROUTES.HOME} className="not-found__link">
        Go home
      </Link>
    </div>
  );
}
