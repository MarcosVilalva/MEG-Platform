import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthenticatedApp } from './AuthenticatedApp';
import '../styles/global.css';
import '../styles/catalogs.css';
import '../styles/admin.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthenticatedApp />
  </React.StrictMode>
);