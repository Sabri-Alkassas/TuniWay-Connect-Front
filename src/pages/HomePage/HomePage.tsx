import { useApi } from '../../hooks'
import { fetchHealth } from '../../api'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import './HomePage.css'

export function HomePage() {
  const { data, loading, error, refetch } = useApi(fetchHealth);

  return (
    <div className="home-page">
      <h1 className="home-page__title">Welcome</h1>
      <p className="home-page__tagline">React + TypeScript + Parcel</p>

      <section className="home-page__section">
        <h2>Backend status</h2>
        {loading && <LoadingSpinner message="Checking backend…" />}
        {error && <ErrorMessage message={error} onRetry={refetch} />}
        {data && (
          <p className="home-page__status home-page__status--success">{data.message}</p>
        )}
      </section>
    </div>
  );
}
