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
import { hashPassword, needsPasswordUpgrade, verifyPassword } from '../utils/security';
import { startSession } from '../utils/session';

interface Configuracao {
  id: string;
  senhaHash?: string;
  nomeEmpresa?: string;
  endereco?: string;
  telefone?: string;
  numeroAutorizacao?: string;
}

interface UsuarioLogin {
  id: string;
  nome: string;
  email: string;
  idioma: string;
  senhaHash?: string;
}

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UsuarioLogin[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [primeiroUso, setPrimeiroUso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/api/usuarios').catch(() => ({ data: [] })),
      axios.get('/api/configuracoes').catch(() => ({ data: [] })),
    ]).then(([usersRes, configRes]) => {
      const loadedUsers: UsuarioLogin[] = usersRes.data;
      setUsers(loadedUsers);
      const configItems: Configuracao[] = configRes.data;
      if (configItems.length > 0) setConfig(configItems[0]);
      if (loadedUsers.length === 0) setPrimeiroUso(true);
    }).finally(() => setLoading(false));
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

        await axios.post('/api/usuarios', {
          nome: usuario.trim(),
          email: '',
          idioma: 'pt',
          senhaHash: await hashPassword(senha)
        });
        if (config?.id) {
          await axios.put(`/api/configuracoes/${config.id}`, { ...config });
        }
        startSession();
        onLogin();
      } else {
        if (!usuario.trim()) { setErro(t('digiteUsuario')); setSalvando(false); return; }
        const found = users.find(u => u.nome === usuario.trim());
        if (found) {
          const senhaValida = await verifyPassword(senha, found.senhaHash);
          if (!senhaValida) {
            setErro(t('usuarioSenhaInvalidos'));
            return;
          }

          if (needsPasswordUpgrade(found.senhaHash)) {
            await axios.patch(`/api/usuarios/${found.id}`, { senhaHash: await hashPassword(senha) }).catch(() => {});
          }

          startSession();
          onLogin();
        } else {
          setErro(t('usuarioSenhaInvalidos'));
        }
      }
    } catch {
      setErro(t('erroServidorLogin'));
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
