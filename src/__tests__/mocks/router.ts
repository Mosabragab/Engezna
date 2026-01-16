import { vi } from 'vitest';

/**
 * Next.js Router Mock for Unit Tests
 */

export const createRouterMock = (initialPathname: string = '/') => {
  let currentPathname = initialPathname;
  const searchParams = new URLSearchParams();

  const routerMock = {
    pathname: currentPathname,
    route: currentPathname,
    query: {},
    asPath: currentPathname,
    basePath: '',
    locale: 'ar',
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    isFallback: false,

    push: vi.fn().mockImplementation((url: string) => {
      currentPathname = typeof url === 'string' ? url : url;
      routerMock.pathname = currentPathname;
      routerMock.asPath = currentPathname;
      return Promise.resolve(true);
    }),

    replace: vi.fn().mockImplementation((url: string) => {
      currentPathname = typeof url === 'string' ? url : url;
      routerMock.pathname = currentPathname;
      routerMock.asPath = currentPathname;
      return Promise.resolve(true);
    }),

    prefetch: vi.fn().mockResolvedValue(undefined),

    back: vi.fn().mockImplementation(() => {
      // Simulate going back
    }),

    forward: vi.fn().mockImplementation(() => {
      // Simulate going forward
    }),

    reload: vi.fn(),

    beforePopState: vi.fn(),

    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },

    // Helper to get current pathname
    _getPathname: () => currentPathname,

    // Helper to set pathname
    _setPathname: (path: string) => {
      currentPathname = path;
      routerMock.pathname = path;
      routerMock.asPath = path;
    },
  };

  return routerMock;
};

/**
 * Next.js useRouter mock
 */
export const useRouterMock = createRouterMock();

/**
 * Next.js usePathname mock
 */
export const usePathnameMock = vi.fn().mockReturnValue('/');

/**
 * Next.js useSearchParams mock
 */
export const useSearchParamsMock = vi.fn().mockReturnValue(new URLSearchParams());

/**
 * Next.js useParams mock
 */
export const useParamsMock = vi.fn().mockReturnValue({});

/**
 * Next.js redirect mock
 */
export const redirectMock = vi.fn();

/**
 * Setup all Next.js navigation mocks
 */
export const setupNavigationMocks = () => {
  vi.mock('next/navigation', () => ({
    useRouter: () => useRouterMock,
    usePathname: usePathnameMock,
    useSearchParams: useSearchParamsMock,
    useParams: useParamsMock,
    redirect: redirectMock,
    notFound: vi.fn(),
  }));
};
