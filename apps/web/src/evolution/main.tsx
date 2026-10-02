import React from 'react';
import {createRoot} from 'react-dom/client';
import {EvolutionApp} from './app/EvolutionApp';
import './styles/global.css';

document.documentElement.dataset.megRuntime='evolution-web';
document.body.dataset.megRuntime='evolution-web';

const root=document.getElementById('root');
if(!root) throw new Error('EVOLUTION_ROOT_NOT_FOUND');

createRoot(root).render(
  <React.StrictMode>
    <EvolutionApp/>
  </React.StrictMode>
);
