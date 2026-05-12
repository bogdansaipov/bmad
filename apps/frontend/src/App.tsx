import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HealthCheck } from './features/ui-shell/HealthCheck';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <div>
        <h1>Handrix</h1>
        <HealthCheck />
      </div>
    ),
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
