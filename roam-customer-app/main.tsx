import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './client/App.tsx'

// Add error handling for initialization
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Wrap the render in a try-catch to handle initialization errors
try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize app:', error);
  
  // Show a fallback error message
  rootElement.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      padding: 2rem;
    ">
      <h1 style="color: #dc2626; margin-bottom: 1rem;">Something went wrong</h1>
      <p style="color: #6b7280; margin-bottom: 1rem;">
        We're having trouble loading the app. Please try refreshing the page.
      </p>
      <button 
        onclick="window.location.reload()"
        style="
          background: #2563eb;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
        "
      >
        Refresh Page
      </button>
    </div>
  `;
}
