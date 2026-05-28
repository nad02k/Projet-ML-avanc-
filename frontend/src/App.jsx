import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import Config from './pages/Config';
import Data from './pages/Data';
import Visualize from './pages/Visualize';
import Experiments from './pages/Experiments';
import AutoML from './pages/AutoML';
import Predict from './pages/Predict';
import Registry from './pages/Registry';
import Monitoring from './pages/Monitoring';
import CICD from './pages/CICD';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [selectedModels, setSelectedModels] = useState(['rf']);
  const [comparingModels, setComparingModels] = useState([]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            },
            success: { iconTheme: { primary: '#059669', secondary: '#ffffff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
          }}
        />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/models"
              element={
                <Models
                  selected={selectedModels}
                  setSelected={setSelectedModels}
                  comparing={comparingModels}
                  setComparing={setComparingModels}
                />
              }
            />
            <Route path="/config" element={<Config selectedIds={selectedModels} />} />
            <Route path="/data" element={<Data />} />
            <Route path="/visualize" element={<Visualize />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/registry" element={<Registry />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/cicd" element={<CICD />} />
            <Route path="/automl" element={<AutoML />} />
            <Route path="/predict" element={<Predict />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
