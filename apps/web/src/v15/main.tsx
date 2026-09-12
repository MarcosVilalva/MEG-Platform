import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/v15-source-01.css';
import './styles/v15-source-02.css';
import './styles/v15-source-03.css';
import './styles/v15-source-04.css';
import './styles/v15-source-05.css';
import './styles/v15-source-06.css';
import './styles/phoenix.css';

document.documentElement.dataset.theme = localStorage.getItem('meg.v15.theme') || 'dark';
document.body.classList.add('web-validation');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
