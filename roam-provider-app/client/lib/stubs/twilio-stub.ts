// Twilio stub - server-only library
// This file prevents Twilio from being bundled in client code
// Twilio should only be used in server-side API routes

const TwilioStub = function() {
  if (typeof window !== 'undefined') {
    throw new Error('Twilio is a server-only library and cannot be used in the browser. Use API endpoints instead.');
  }
};

TwilioStub.prototype = {};

// Export as default (ESM)
const defaultExport = TwilioStub;
export default defaultExport;

// Also export as named export
export { TwilioStub as Twilio };

// Support CommonJS require() style imports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TwilioStub;
  module.exports.default = TwilioStub;
  module.exports.Twilio = TwilioStub;
}

