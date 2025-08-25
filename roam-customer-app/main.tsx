import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './client/App.tsx'

// Create root element if it doesn't exist
const rootElement = document.getElementById('root') || (() => {
  const div = document.createElement('div')
  div.id = 'root'
  document.body.appendChild(div)
  return div
})()

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
