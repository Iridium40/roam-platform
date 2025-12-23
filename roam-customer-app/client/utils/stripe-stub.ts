/**
 * Stripe stub for browser environment
 * The actual Stripe SDK is only used on the server-side.
 * Client-side uses @stripe/stripe-js and @stripe/react-stripe-js instead.
 */

// Export a dummy class that will never be used in the browser
export default class Stripe {
  constructor() {
    throw new Error('Stripe SDK is not available in browser. Use @stripe/stripe-js instead.');
  }
}

// Export empty types/namespaces that might be imported
export type { Stripe };
