import { createServer } from './index.js';

const port = 3004;
const app = createServer();

app.listen(port, () => {
  console.log(`🚀 Development API server running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/services/get-service - Get service details`);
  console.log(`   GET  /api/reviews/business - Get business reviews`);
  console.log(`   GET  /api/reviews/provider - Get provider reviews`);
  console.log(`   GET  /api/reviews/bulk-ratings - Get bulk business ratings`);
  console.log(`   GET  /api/bookings/list - List customer bookings`);
  console.log(`   POST /api/contact/submit - Contact form submissions`);
  console.log(`   POST /api/chat - AI Chatbot API`);
  console.log(`   POST /api/subscribe - Newsletter subscription`);
  console.log(`   POST /api/stripe/create-checkout-session - Create Stripe checkout`);
  console.log(`   POST /api/stripe/create-balance-checkout-session - Create balance checkout`);
  console.log(`   POST /api/stripe/create-balance-payment-intent - Create balance payment intent`);
  console.log(`   POST /api/stripe/create-tip-checkout-session - Create tip checkout`);
  console.log(`   POST /api/stripe/create-tip-payment-intent - Create tip payment intent`);
  console.log(`   POST /api/stripe/webhook - Stripe webhook handler`);
  console.log(`   GET  /api/stripe/session - Get Stripe session details`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   GET  /api/ping - Ping test`);
});
