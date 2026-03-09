import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  IconButton, Tooltip, Divider, Typography, AppBar, Toolbar, useMediaQuery, useTheme,
  Select, MenuItem
} from '@mui/material';
import axios from 'axios';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SettingsIcon from '@mui/icons-material/Settings';
import HirataLogo from '../assets/Hirata Logo.svg';
import { useLanguage } from './LanguageContext';

export const SIDEBAR_EXPANDED = 240;
export const SIDEBAR_COLLAPSED = 64;

const navItems = [
  { text: 'Dashboard',          path: '/',                icon: <DashboardIcon /> },
  { text: 'OS',                 path: '/ordens',          icon: <AssignmentIcon /> },
  { text: 'Clientes',           path: '/clientes',        icon: <PeopleIcon /> },
  { text: 'Veículos',           path: '/veiculos',        icon: <DirectionsCarIcon /> },
  { text: 'Serviços',           path: '/servicos',        icon: <BuildIcon /> },
  { text: 'Peças',              path: '/pecas',           icon: <BuildIcon /> },
  { text: 'Vendas Carros',      path: '/vendas-carros',   icon: <MonetizationOnIcon /> },
  { text: 'Gestão de Vendas',   path: '/vendas-gestao',   icon: <AccountBalanceWalletIcon /> },
  { text: 'Financeiro',         path: '/financeiro',      icon: <AccountBalanceWalletIcon /> },
  { text: 'Relatórios',         path: '/relatorios',      icon: <AssessmentIcon /> },
  { text: 'Gerar Relatório PDF',path: '/gerar-relatorio', icon: <PictureAsPdfIcon /> },
  { text: 'Usuários',           path: '/usuarios',        icon: <PeopleIcon /> },
  { text: 'Configurações',      path: '/configuracoes',   icon: <SettingsIcon /> },
];

interface NavbarProps {
  expanded: boolean;
  onToggle: () => void;
}

const Navbar = ({ expanded, onToggle }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    axios.get('http://localhost:3001/configuracoes')
      .then(r => { if (r.data[0]?.nomeEmpresa) setNomeEmpresa(r.data[0].nomeEmpresa); })
      .catch(() => {});
  }, []);

  const drawerContent = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#000000',
      overflowX: 'hidden',
    }}>
      {/* Logo + toggle */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'space-between' : 'center',
        px: expanded ? 1.5 : 0,
        py: 1.5,
        minHeight: 80,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src={HirataLogo}
            alt="Logo"
            style={{
              height: expanded ? 90 : 48,
              transition: 'height 0.25s ease',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
            }}
          />
          {expanded && (
            <Typography sx={{
              ml: 1, color: '#FFD600', fontWeight: 800, fontSize: 13,
              lineHeight: 1.2, letterSpacing: 0.5,
              opacity: expanded ? 1 : 0, transition: 'opacity 0.2s',
              whiteSpace: 'nowrap',
            }}>
              Oficina<br />Mecânica
            </Typography>
          )}
        </Link>
        {!isMobile && (
          <IconButton onClick={onToggle} size="small"
            sx={{ color: '#FFD600', '&:hover': { color: '#fff', background: 'rgba(255,214,0,0.12)' } }}>
            {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,214,0,0.2)', mx: 1 }} />

      {/* Nav items */}
      <List sx={{ flexGrow: 1, pt: 1, px: 0.5 }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const btn = (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  minHeight: 44,
                  borderRadius: 2,
                  px: expanded ? 1.5 : 1,
                  justifyContent: expanded ? 'flex-start' : 'center',
                  backgroundColor: isActive ? 'rgba(255,214,0,0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #FFD600' : '3px solid transparent',
                  '&:hover': { backgroundColor: 'rgba(255,214,0,0.08)' },
                  transition: 'all 0.15s',
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 0,
                  mr: expanded ? 1.5 : 'auto',
                  justifyContent: 'center',
                  color: isActive ? '#FFD600' : 'rgba(255,214,0,0.65)',
                  '& svg': { fontSize: 22 },
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isActive ? '#FFD600' : 'rgba(255,214,0,0.75)',
                    whiteSpace: 'nowrap',
                  }}
                  sx={{ opacity: expanded ? 1 : 0, transition: 'opacity 0.2s', m: 0 }}
                />
              </ListItemButton>
            </ListItem>
          );

          return expanded ? btn : (
            <Tooltip key={item.text} title={item.text} placement="right" arrow>
              {btn}
            </Tooltip>
          );
        })}
      </List>

      {/* Rodapé */}
      <Box sx={{ borderTop: '1px solid rgba(255,214,0,0.15)', p: expanded ? 1.5 : 0.75 }}>
        {expanded && (
          <>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,214,0,0.6)', display: 'block', mb: 0.5 }}>
                Idioma
              </Typography>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'pt' | 'fil')}
                size="small"
                sx={{
                  width: '100%',
                  color: '#FFD600',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,214,0,0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,214,0,0.4)' },
                  '& .MuiSvgIcon-root': { color: '#FFD600' },
                  '& .MuiOutlinedInput-input': { padding: '8px 12px', fontSize: '0.875rem' }
                }}
              >
                <MenuItem value="pt">Português</MenuItem>
                <MenuItem value="fil">Filipino</MenuItem>
              </Select>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,214,0,0.1)', mb: 1 }} />
            {nomeEmpresa && (
              <Typography sx={{ color: '#FFD600', fontSize: 11, fontWeight: 700, textAlign: 'center', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nomeEmpresa}
              </Typography>
            )}
            <Typography sx={{ color: 'rgba(255,214,0,0.5)', fontSize: 10, textAlign: 'center', mb: 0.5 }}>
              v1.5
            </Typography>
            <Typography sx={{ fontSize: 10, textAlign: 'center' }}>
              <a
                href="https://andretsc.info"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(255,214,0,0.55)', textDecoration: 'none' }}
                onMouseOver={e => (e.currentTarget.style.color = '#FFD600')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,214,0,0.55)')}
              >
                © Andretsc
              </a>
            </Typography>
          </>
        )}
        {!expanded && (
          <Tooltip title={`${nomeEmpresa || 'Oficina'} · v1.5 · andretsc.info`} placement="right" arrow>
            <Typography sx={{ color: 'rgba(255,214,0,0.4)', fontSize: 9, textAlign: 'center', cursor: 'default' }}>
              v1.5
            </Typography>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, background: '#000000' }}>
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#FFD600' }}>
              <MenuIcon />
            </IconButton>
            <img src={HirataLogo} alt="Logo" style={{ height: 36 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#FFD600' }}>Oficina Mecânica</Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile: temporary overlay drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_EXPANDED, border: 'none' } }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Desktop: permanent sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED,
              overflowX: 'hidden',
              transition: 'width 0.25s ease',
              border: 'none',
              boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Navbar;
