import { useEffect, useState } from 'react'
import { getExampleItems, type ExampleItem } from '../../api/client'
import './ExampleList.css'

export function ExampleList() {
  const [items, setItems] = useState<ExampleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getExampleItems()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load items'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="example-list loading">Loading example items…</p>
  if (error) return <p className="example-list error">Error: {error}</p>

  return (
    <section className="example-list">
      <h2>Example items (from API)</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong> — {item.description}
          </li>
        ))}
      </ul>
    </section>
  )
}
