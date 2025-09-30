import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/ping', (req, res) => {
  res.json({ message: 'API server is running', timestamp: new Date().toISOString() });
});

// Mock endpoints for the new APIs
app.get('/api/reviews', (req, res) => {
  res.json({ 
    data: [], 
    message: 'Reviews API endpoint is working',
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
  });
});

app.get('/api/promotions', (req, res) => {
  res.json({ 
    data: [], 
    message: 'Promotions API endpoint is working',
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
  });
});

app.get('/api/announcements', (req, res) => {
  res.json({ 
    data: [], 
    message: 'Announcements API endpoint is working',
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
  });
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});