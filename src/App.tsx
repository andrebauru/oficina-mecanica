import { useState, useEffect } from 'react';
import axios from 'axios';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ptBR } from '@mui/material/locale';
import Navbar, { SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED } from './components/Navbar';
import { LanguageProvider } from './components/LanguageContext';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Veiculos from './pages/Veiculos';
import Servicos from './pages/Servicos';
import Pecas from './pages/Pecas';
import OrdensServico from './pages/OrdensServico';
import VendasCarros from './pages/VendasCarros';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import GerarRelatorio from './pages/GerarRelatorio';
import Configuracoes from './pages/Configuracoes';
import Usuarios from './pages/Usuarios';
import VendasGestao from './pages/VendasGestao';
import Login from './pages/Login';
import { clearSession, isSessionAuthenticated, startSession, touchSession } from './utils/session';
import './App.css'

const theme = createTheme(
  {
    palette: {
      primary: {
        main: '#0d47a1',
        dark: '#002171',
        light: '#5472d3',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#d32f2f',
        dark: '#9a0007',
        light: '#ff6659',
        contrastText: '#ffffff'
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff'
      },
      text: {
        primary: '#212121',
        secondary: '#757575'
      }
    },
  },
  ptBR
);

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => localStorage.getItem('sidebarExpanded') !== 'false'
  );

  useEffect(() => {
    let isMounted = true;

    axios.get('/api/auth/status')
      .then(res => {
        if (!isMounted) return;
        const isAuthenticated = Boolean(res.data?.authenticated);
        if (isAuthenticated) {
          startSession();
        } else {
          clearSession();
        }
        setAuthenticated(isAuthenticated);
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = isSessionAuthenticated();
        if (!fallback) clearSession();
        setAuthenticated(fallback);
      })
      .finally(() => {
        if (isMounted) setChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const updateActivity = () => touchSession();
    const events: Array<keyof WindowEventMap> = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    events.forEach(eventName => window.addEventListener(eventName, updateActivity, { passive: true }));
    const interval = window.setInterval(() => {
      if (!isSessionAuthenticated()) {
        clearSession();
        setAuthenticated(false);
      }
    }, 60_000);

    touchSession();

    return () => {
      events.forEach(eventName => window.removeEventListener(eventName, updateActivity));
      window.clearInterval(interval);
    };
  }, [authenticated]);

  const handleToggleSidebar = () => {
    setSidebarExpanded(prev => {
      const next = !prev;
      localStorage.setItem('sidebarExpanded', String(next));
      return next;
    });
  };

  return (
    <LanguageProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {checking ? null : !authenticated ? (
          <Login onLogin={() => setAuthenticated(true)} />
        ) : (
          <Router>
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
              <Navbar expanded={sidebarExpanded} onToggle={handleToggleSidebar} />
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  ml: { xs: 0, md: `${sidebarExpanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED}px` },
                  mt: { xs: '64px', md: 0 },
                  transition: 'margin-left 0.25s ease',
                  p: { xs: 2, md: 3 },
                  maxWidth: '100%',
                }}
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/veiculos" element={<Veiculos />} />
                  <Route path="/servicos" element={<Servicos />} />
                  <Route path="/pecas" element={<Pecas />} />
                  <Route path="/ordens" element={<OrdensServico />} />
                  <Route path="/vendas-carros" element={<VendasCarros />} />
                  <Route path="/vendas-gestao" element={<VendasGestao />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/gerar-relatorio" element={<GerarRelatorio />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                </Routes>
              </Box>
            </Box>
          </Router>
        )}
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App
