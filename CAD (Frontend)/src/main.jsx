import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { installBVH } from './three/culling';

// Accelerate all mesh raycasts (selection/picking) with three-mesh-bvh.
installBVH();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
