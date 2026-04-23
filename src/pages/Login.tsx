import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import HirataLogo from '../assets/Hirata Logo.svg';
import { useLanguage } from '../components/LanguageContext';
import { startSession } from '../utils/session';

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const { t } = useLanguage();
  const [primeiroUso, setPrimeiroUso] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    axios.get('/api/usuarios')
      .then(res => setPrimeiroUso(res.data.length === 0))
      .catch(() => setPrimeiroUso(false))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    setErro('');
    if (!senha) { setErro(t('digiteSenha')); return; }

    setSalvando(true);
    try {
      if (primeiroUso) {
        if (!usuario.trim()) { setErro(t('digiteNome')); setSalvando(false); return; }
        if (senha !== confirmar) { setErro(t('senhasNaoConferem')); setSalvando(false); return; }
        if (senha.length < 4) { setErro(t('senhaMinima')); setSalvando(false); return; }

        // Cria o primeiro usuário e já retorna sessão ativa
        await axios.post('/api/auth/setup', { nome: usuario.trim(), senha });
        startSession();
        onLogin();
        return;
      } else {
        if (!usuario.trim()) { setErro(t('digiteUsuario')); setSalvando(false); return; }
      }

      // Autenticação server-side: cria sessão no servidor
      await axios.post('/api/auth/login', { nome: usuario.trim(), senha });
      startSession();
      onLogin();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setErro(t('usuarioSenhaInvalidos'));
      } else {
        setErro(t('erroServidorLogin'));
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%', textAlign: 'center' }} elevation={4}>
        <img src={HirataLogo} alt="Logo" style={{ height: 140, marginBottom: 24 }} />
        <Typography variant="h5" fontWeight="bold" mb={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <LockIcon />
          {primeiroUso ? t('definirAcesso') : t('acessoSistema')}
        </Typography>
        {primeiroUso && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('primeiroAcessoTexto')}
          </Typography>
        )}
        {erro && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{erro}</Alert>}
        <TextField
          fullWidth
          label={primeiroUso ? t('nome') : t('usuario')}
          type="text"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          label={t('senha')}
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ mb: 2 }}
        />
        {primeiroUso && (
          <TextField
            fullWidth
            label={t('confirmarSenha')}
            type="password"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ mb: 2 }}
          />
        )}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={salvando}
          startIcon={salvando ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
        >
          {primeiroUso ? t('criarAcesso') : t('entrar')}
        </Button>
      </Paper>
    </Box>
  );
};

export default Login;
