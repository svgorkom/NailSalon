import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element.');

// The proof page of the salon game is not linked anywhere; it is only reached by its address.
const ProtoViewer = lazy(() => import('./ui/ProtoViewer').then((module) => ({ default: module.ProtoViewer })));
const proof = window.location.hash === '#/proto';

createRoot(root).render(
  <StrictMode>
    {proof ? (
      <Suspense fallback={null}>
        <ProtoViewer />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
