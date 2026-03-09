import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import LockIcon from '@mui/icons-material/Lock';

interface Configuracao {
  id?: string;
  senhaHash?: string;
  nomeEmpresa?: string;
  endereco?: string;
  telefone?: string;
  numeroAutorizacao?: string;
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

const Configuracoes = () => {
  const [config, setConfig] = useState<Configuracao>({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    endereco: '',
    telefone: '',
    numeroAutorizacao: ''
  });
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState('');
  const [salvandoInfo, setSalvandoInfo] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get('http://152.42.165.18:3000/configuracoes')
      .then(res => {
        const items: Configuracao[] = res.data;
        if (items.length > 0) {
          setConfig(items[0]);
          setFormData({
            nomeEmpresa: items[0].nomeEmpresa ?? '',
            endereco: items[0].endereco ?? '',
            telefone: items[0].telefone ?? '',
            numeroAutorizacao: items[0].numeroAutorizacao ?? ''
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveInfo = async () => {
    setSalvandoInfo(true);
    try {
      const updated = { ...config, ...formData };
      if (config.id) {
        await axios.put(`http://152.42.165.18:3000/configuracoes/${config.id}`, updated);
        setConfig(updated);
      } else {
        const res = await axios.post('http://152.42.165.18:3000/configuracoes', updated);
        setConfig(res.data);
      }
      setSnackbar({ open: true, message: 'Informações da empresa salvas', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Erro ao salvar informações', severity: 'error' });
    } finally {
      setSalvandoInfo(false);
    }
  };

  const handleChangeSenha = async () => {
    setSenhaErro('');
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setSenhaErro('Preencha todos os campos');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaErro('Nova senha e confirmação não coincidem');
      return;
    }
    if (novaSenha.length < 4) {
      setSenhaErro('Senha deve ter ao menos 4 caracteres');
      return;
    }

    setSalvandoSenha(true);
    try {
      const hashAtual = hashPassword(senhaAtual);
      if (config.senhaHash && hashAtual !== config.senhaHash) {
        setSenhaErro('Senha atual incorreta');
        return;
      }
      const hashNova = hashPassword(novaSenha);
      const updated = { ...config, senhaHash: hashNova };
      if (config.id) {
        await axios.put(`http://152.42.165.18:3000/configuracoes/${config.id}`, updated);
      } else {
        const res = await axios.post('http://152.42.165.18:3000/configuracoes', updated);
        setConfig(res.data);
      }
      setConfig(prev => ({ ...prev, senhaHash: hashNova }));
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setSnackbar({ open: true, message: 'Senha alterada com sucesso', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Erro ao alterar senha', severity: 'error' });
    } finally {
      setSalvandoSenha(false);
    }
  };

  const COLLECTIONS = ['clientes', 'veiculos', 'servicos', 'pecas', 'ordens_servico', 'vendas_carros', 'financeiro', 'categorias_financeiro', 'configuracoes', 'documentos'];

  const handleBackup = async () => {
    try {
      const results = await Promise.all(
        COLLECTIONS.map(col =>
          axios.get(`http://152.42.165.18:3000/${col}`).then(r => ({ [col]: r.data }))
        )
      );
      const db = Object.assign({}, ...results);
      const json = JSON.stringify(db, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup-oficina-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Backup gerado com sucesso', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Erro ao gerar backup', severity: 'error' });
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestaurando(true);
    try {
      const text = await file.text();
      const db = JSON.parse(text);
      const collections = Object.keys(db) as string[];

      for (const col of collections) {
        const newItems: { id: string }[] = db[col];
        const existing: { id: string }[] = await axios.get(`http://152.42.165.18:3000/${col}`)
          .then(r => r.data)
          .catch(() => []);

        for (const item of existing) {
          await axios.delete(`http://152.42.165.18:3000/${col}/${item.id}`).catch(() => {});
        }
        for (const item of newItems) {
          await axios.post(`http://152.42.165.18:3000/${col}`, item).catch(() => {});
        }
      }
      setSnackbar({ open: true, message: 'Restauração concluída com sucesso — recarregue a página', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Erro ao restaurar — arquivo inválido?', severity: 'error' });
    } finally {
      setRestaurando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>Configurações</Typography>

      {/* Company Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Informações da Empresa</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Estes dados aparecem no rodapé dos relatórios PDF gerados.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Empresa"
                value={formData.nomeEmpresa}
                onChange={e => setFormData(p => ({ ...p, nomeEmpresa: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                value={formData.endereco}
                onChange={e => setFormData(p => ({ ...p, endereco: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.telefone}
                onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de Autorização Oficial"
                value={formData.numeroAutorizacao}
                onChange={e => setFormData(p => ({ ...p, numeroAutorizacao: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={salvandoInfo ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveInfo}
                disabled={salvandoInfo}
              >
                Salvar Informações
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Password */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon /> Alterar Senha
          </Typography>
          {senhaErro && <Alert severity="error" sx={{ mb: 2 }}>{senhaErro}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Senha Atual"
                type="password"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nova Senha"
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirmar Nova Senha"
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="warning"
                startIcon={salvandoSenha ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                onClick={handleChangeSenha}
                disabled={salvandoSenha}
              >
                Alterar Senha
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Backup / Restore */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={1}>Backup e Restauração</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Faça download do banco de dados completo e restaure-o em caso de reinstalação do sistema.
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={handleBackup}
            >
              Backup (Download)
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={restaurando ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
              onClick={handleRestoreClick}
              disabled={restaurando}
            >
              {restaurando ? 'Restaurando...' : 'Restaurar (Upload)'}
            </Button>
          </Box>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleRestoreFile}
          />
          {restaurando && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              Restaurando dados, aguarde...
            </Typography>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(p => ({ ...p, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Configuracoes;
