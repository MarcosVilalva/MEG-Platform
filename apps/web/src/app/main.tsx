import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthenticatedApp } from './AuthenticatedApp';
import '../styles/meg-v15.css';

document.body.classList.add('web-validation');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthenticatedApp />
  </React.StrictMode>
);
