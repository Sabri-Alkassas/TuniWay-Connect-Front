import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ROUTES } from '../routes'

const HomePage = lazy(() =>
  import('../pages/HomePage').then((m) => ({ default: m.HomePage }))
)
const ExamplePage = lazy(() =>
  import('../pages/ExamplePage').then((m) => ({ default: m.ExamplePage }))
)
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)

const fallback = <LoadingSpinner message="Loading…" />

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path={ROUTES.HOME}
            element={
              <Suspense fallback={fallback}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.EXAMPLE}
            element={
              <Suspense fallback={fallback}>
                <ExamplePage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.NOT_FOUND}
            element={
              <Suspense fallback={fallback}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
