/**
 * Next.js Middleware Entry Point
 *
 * This file must be named 'middleware.ts' for Next.js to recognize it.
 * It re-exports from proxy.ts which contains the actual middleware logic.
 */
export { default, config } from './proxy';
