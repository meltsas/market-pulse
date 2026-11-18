import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';
import { routes } from '../app/routes.tsx';
import { createAppStore } from '../app/store.ts';

export function renderAppAt(path: string) {
  const store = createAppStore();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return { store, router };
}

// Answers API requests by path; unknown paths and null bodies get an error response.
export function stubApiResponses(responseBodies: Record<string, unknown>) {
  const fetchMock = vi.fn<typeof fetch>((request) => {
    const { pathname } = new URL(
      request instanceof Request ? request.url : String(request),
    );
    const responseBody = responseBodies[pathname];
    return Promise.resolve(
      responseBody === undefined || responseBody === null
        ? new Response(null, { status: 503 })
        : Response.json(responseBody),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function requestedPaths(fetchMock: ReturnType<typeof stubApiResponses>) {
  return fetchMock.mock.calls.map(([request]) =>
    request instanceof Request ? new URL(request.url).pathname : '',
  );
}
