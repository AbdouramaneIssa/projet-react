// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client'; // Importe createRoot depuis react-dom/client
import WrappedApp from './App.jsx'; // Assure-toi que le chemin est correct et que tu importes WrappedApp
import './index.css'; // Importe ton fichier CSS global

// Utilise createRoot pour monter ton application React (méthode recommandée pour React 18+)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WrappedApp />
  </React.StrictMode>,
);
