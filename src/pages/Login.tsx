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

// cyrb53 — fast, consistent, works in any browser context (no secure origin needed)
function hashPassword(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const Login = ({ onLogin }: LoginProps) => {
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
      axios.get('http://localhost:3001/usuarios').catch(() => ({ data: [] })),
      axios.get('http://localhost:3001/configuracoes').catch(() => ({ data: [] })),
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
    if (!senha) { setErro('Digite a senha'); return; }

    setSalvando(true);
    try {
      const hash = hashPassword(senha);

      if (primeiroUso) {
        if (!usuario.trim()) { setErro('Digite o nome'); setSalvando(false); return; }
        if (senha !== confirmar) { setErro('Senhas não coincidem'); setSalvando(false); return; }
        if (senha.length < 4) { setErro('Senha deve ter ao menos 4 caracteres'); setSalvando(false); return; }

        await axios.post('http://localhost:3001/usuarios', {
          nome: usuario.trim(),
          email: '',
          idioma: 'pt',
          senhaHash: hash
        });
        if (config?.id) {
          await axios.put(`http://localhost:3001/configuracoes/${config.id}`, { ...config });
        }
        sessionStorage.setItem('authenticated', 'true');
        onLogin();
      } else {
        if (!usuario.trim()) { setErro('Digite o nome de usuário'); setSalvando(false); return; }
        const found = users.find(u => u.nome === usuario.trim() && u.senhaHash === hash);
        if (found) {
          sessionStorage.setItem('authenticated', 'true');
          onLogin();
        } else {
          setErro('Usuário ou senha incorretos');
        }
      }
    } catch {
      setErro('Erro ao processar. Verifique se o servidor está rodando.');
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
        <img src={HirataLogo} alt="Logo" style={{ height: 80, marginBottom: 16 }} />
        <Typography variant="h5" fontWeight="bold" mb={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <LockIcon />
          {primeiroUso ? 'Definir Acesso' : 'Acesso ao Sistema'}
        </Typography>
        {primeiroUso && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            Primeiro acesso — crie o primeiro usuário para proteger o sistema.
          </Typography>
        )}
        {erro && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{erro}</Alert>}
        <TextField
          fullWidth
          label={primeiroUso ? "Nome" : "Usuário"}
          type="text"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          label="Senha"
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ mb: 2 }}
        />
        {primeiroUso && (
          <TextField
            fullWidth
            label="Confirmar Senha"
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
          {primeiroUso ? 'Criar Acesso' : 'Entrar'}
        </Button>
      </Paper>
    </Box>
  );
};

export default Login;
