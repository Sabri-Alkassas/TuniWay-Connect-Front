import { useApi } from '../../hooks'
import { fetchExampleItems } from '../../api'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { ExampleItem } from '../../types/api'
import './ExamplePage.css'

export function ExamplePage() {
  const { data: items, loading, error, refetch } = useApi(fetchExampleItems);

  return (
    <div className="example-page">
      <h1 className="example-page__title">Example items</h1>
      <p className="example-page__intro">Data loaded from the backend API.</p>

      {loading && <LoadingSpinner message="Loading items…" />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {items && items.length > 0 && (
        <ul className="example-page__list">
          {items.map((item: ExampleItem) => (
            <li key={item.id} className="example-page__item">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
