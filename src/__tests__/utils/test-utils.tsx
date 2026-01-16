import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Custom render function with providers
 *
 * Add your app's providers here (e.g., ThemeProvider, IntlProvider)
 */

interface ProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: ProvidersProps) => {
  // Add your providers here
  // Example:
  // return (
  //   <ThemeProvider>
  //     <IntlProvider locale="ar">
  //       {children}
  //     </IntlProvider>
  //   </ThemeProvider>
  // );

  return <>{children}</>;
};

/**
 * Custom render that wraps components with providers
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Export userEvent
export { userEvent };

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a mock function that resolves after a delay
 */
export const createDelayedMock = <T,>(value: T, delay: number = 100) => {
  return () => new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));
};

/**
 * Create a mock function that rejects after a delay
 */
export const createDelayedErrorMock = (error: Error, delay: number = 100) => {
  return () => new Promise((_, reject) => setTimeout(() => reject(error), delay));
};
