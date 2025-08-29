import { createServer } from './index.js';

const port = 3001;
const app = createServer();

app.listen(port, () => {
  console.log(`🚀 Development API server running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/contact/submit - Contact form submissions`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   GET  /api/ping - Ping test`);
});
