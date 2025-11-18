// Stub for Twilio SDK in browser - Twilio should only be used server-side
// This prevents bundling errors when importing from @roam/shared

export default {
  // Empty stub - Twilio is not available in the browser
};

export const Twilio = class {
  constructor() {
    throw new Error('Twilio SDK cannot be used in the browser. Use API endpoints instead.');
  }
};

