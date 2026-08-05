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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLanguage } from '../components/LanguageContext';
import { sanitizeMultilineText, sanitizeText } from '../utils/security';

interface Configuracao {
  id?: string;
  nomeEmpresa?: string;
  endereco?: string;
  telefone?: string;
  numeroAutorizacao?: string;
}

const Configuracoes = () => {
  const { t, language } = useLanguage();
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

  // --- Estados do SendGrid ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [sendGridApiKey, setSendGridApiKey] = useState('');
  const [sendGridEmailRemetente, setSendGridEmailRemetente] = useState('');
  const [apiKeyConfigurada, setApiKeyConfigurada] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState('');
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [testandoEmail, setTestandoEmail] = useState(false);
  const [dialogTesteAberto, setDialogTesteAberto] = useState(false);
  const [emailTesteDestino, setEmailTesteDestino] = useState('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        // Carrega dados da empresa
        const configRes = await axios.get('/api/configuracoes');
        const items: Configuracao[] = configRes.data;
        if (items.length > 0) {
          setConfig(items[0]);
          setFormData({
            nomeEmpresa: items[0].nomeEmpresa ?? '',
            endereco: items[0].endereco ?? '',
            telefone: items[0].telefone ?? '',
            numeroAutorizacao: items[0].numeroAutorizacao ?? ''
          });
        }

        // Carrega status do usuário para verificar permissão admin
        const authRes = await axios.get('/api/auth/status');
        const cargoUsuario = authRes.data?.user?.cargo;
        if (cargoUsuario === 'admin') {
          setIsAdmin(true);
          // Busca configurações do SendGrid
          const sgRes = await axios.get('/api/sendgrid/config');
          setSendGridEmailRemetente(sgRes.data?.emailRemetente || '');
          setApiKeyConfigurada(sgRes.data?.apiKeyConfigurada || false);
          setApiKeyPreview(sgRes.data?.apiKeyPreview || '');
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarConfiguracoes();
  }, []);

  const handleSaveInfo = async () => {
    setSalvandoInfo(true);
    try {
      const updated = { ...config, ...formData };
      updated.nomeEmpresa = sanitizeText(updated.nomeEmpresa || '', 120);
      updated.endereco = sanitizeMultilineText(updated.endereco || '', 250);
      updated.telefone = sanitizeText(updated.telefone || '', 40);
      updated.numeroAutorizacao = sanitizeText(updated.numeroAutorizacao || '', 60);
      if (config.id) {
        await axios.put(`/api/configuracoes/${config.id}`, updated);
        setConfig(updated);
      } else {
        const res = await axios.post('/api/configuracoes', updated);
        setConfig(res.data);
      }
      setSnackbar({ open: true, message: t('infoEmpresaSalvas'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('erroSalvarInfo'), severity: 'error' });
    } finally {
      setSalvandoInfo(false);
    }
  };

  const handleChangeSenha = async () => {
    setSenhaErro('');
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setSenhaErro(t('preencherTodosCampos'));
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaErro(t('senhasNaoConferem'));
      return;
    }
    if (novaSenha.length < 4) {
      setSenhaErro(t('senhaMinima'));
      return;
    }

    setSalvandoSenha(true);
    try {
      await axios.post('/api/auth/change-password', {
        senhaAtual,
        novaSenha,
      });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setSnackbar({ open: true, message: t('senhaAlterada'), severity: 'success' });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setSenhaErro(t('senhaAtualIncorreta'));
      } else {
        setSnackbar({ open: true, message: t('erroAlterarSenha'), severity: 'error' });
      }
    } finally {
      setSalvandoSenha(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    setSalvandoEmail(true);
    try {
      await axios.put('/api/sendgrid/config', {
        apiKey: sendGridApiKey,
        emailRemetente: sendGridEmailRemetente,
      });
      setSnackbar({ open: true, message: t('configEmailSalva'), severity: 'success' });
      const sgRes = await axios.get('/api/sendgrid/config');
      setSendGridEmailRemetente(sgRes.data?.emailRemetente || '');
      setApiKeyConfigurada(sgRes.data?.apiKeyConfigurada || false);
      setApiKeyPreview(sgRes.data?.apiKeyPreview || '');
      setSendGridApiKey(''); // limpa o input após salvar com sucesso
    } catch {
      setSnackbar({ open: true, message: t('erroSalvarConfigEmail'), severity: 'error' });
    } finally {
      setSalvandoEmail(false);
    }
  };

  const handleDispararEmailTeste = async () => {
    if (!emailTesteDestino.trim()) return;
    setTestandoEmail(true);
    try {
      await axios.post('/api/sendgrid/testar-chave', {
        apiKey: sendGridApiKey,
        emailDestino: emailTesteDestino.trim(),
        idioma: language
      });
      setSnackbar({ open: true, message: t('emailTesteEnviado'), severity: 'success' });
      setDialogTesteAberto(false);
      setEmailTesteDestino('');
    } catch (err: any) {
      const msgErro = err?.response?.data?.error || t('erroApiSendGrid');
      setSnackbar({ open: true, message: msgErro, severity: 'error' });
    } finally {
      setTestandoEmail(false);
    }
  };

  const COLLECTIONS = ['clientes', 'veiculos', 'servicos', 'pecas', 'ordens_servico', 'vendas_carros', 'financeiro', 'categorias_financeiro', 'configuracoes', 'documentos'];

  const handleBackup = async () => {
    try {
      const results = await Promise.all(
        COLLECTIONS.map(col =>
          axios.get(`/api/${col}`).then(r => ({ [col]: r.data }))
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
      setSnackbar({ open: true, message: t('backupSucesso'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('erroBackup'), severity: 'error' });
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
      const collections = COLLECTIONS.filter(col => Array.isArray(db[col]));

      for (const col of collections) {
        const newItems: { id: string }[] = db[col];
        const existing: { id: string }[] = await axios.get(`/api/${col}`)
          .then(r => r.data)
          .catch(() => []);

        for (const item of existing) {
          await axios.delete(`/api/${col}/${item.id}`).catch(() => {});
        }
        for (const item of newItems) {
          await axios.post(`/api/${col}`, item).catch(() => {});
        }
      }
      setSnackbar({ open: true, message: t('restauracaoSucesso'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('erroRestauracao'), severity: 'error' });
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
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>{t('configuracoes_titulo')}</Typography>

      {/* Company Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>{t('infoEmpresa')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('dadosAparecemPdf')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('nomeEmpresa')}
                value={formData.nomeEmpresa}
                onChange={e => setFormData(p => ({ ...p, nomeEmpresa: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('endereco')}
                value={formData.endereco}
                onChange={e => setFormData(p => ({ ...p, endereco: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('telefone')}
                value={formData.telefone}
                onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('numeroAutorizacao')}
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
                {t('salvarInformacoes')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Seção SendGrid (Visível apenas para administradores) */}
      {isAdmin && (
        <Card sx={{ mb: 3, borderLeft: '4px solid #1a237e' }}>
          <CardContent>
            <Typography variant="h6" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon color="primary" /> {t('configuracoesSendGrid')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('descricaoSendGrid')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('sendGridApiKey')}
                  type="password"
                  placeholder={apiKeyConfigurada ? apiKeyPreview : 'SG.xxxx...'}
                  value={sendGridApiKey}
                  onChange={e => setSendGridApiKey(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('emailRemetente')}
                  type="email"
                  placeholder="exemplo@seudominio.com"
                  value={sendGridEmailRemetente}
                  onChange={e => setSendGridEmailRemetente(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  id="btn-salvar-email-config"
                  variant="contained"
                  startIcon={salvandoEmail ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveEmailConfig}
                  disabled={salvandoEmail}
                >
                  {t('salvarConfigEmail')}
                </Button>
                <Button
                  id="btn-abrir-teste-email"
                  variant="outlined"
                  color="secondary"
                  onClick={() => setDialogTesteAberto(true)}
                  disabled={salvandoEmail}
                >
                  {t('testarChaveApi')}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Password */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon /> {t('alterarSenha')}
          </Typography>
          {senhaErro && <Alert severity="error" sx={{ mb: 2 }}>{senhaErro}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('senhaAtual')}
                type="password"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('novaSenha')}
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('confirmarSenha')}
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
                {t('alterarSenhaBtn')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Backup / Restore */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={1}>{t('backup')}</Typography>
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
              {t('backupDownload')}
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

      {/* Dialog para Testar Chave API */}
      <Dialog open={dialogTesteAberto} onClose={() => setDialogTesteAberto(false)} maxWidth="xs" fullWidth id="dialog-teste-email">
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('testarChaveApi')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Digite o e-mail de destino para enviar um e-mail de teste utilizando a API Key do SendGrid configurada.
          </Typography>
          <TextField
            id="input-email-teste"
            autoFocus
            fullWidth
            margin="dense"
            label={t('emailTeste')}
            type="email"
            value={emailTesteDestino}
            onChange={e => setEmailTesteDestino(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogTesteAberto(false)} color="inherit">{t('cancelar')}</Button>
          <Button
            id="btn-enviar-email-teste"
            onClick={handleDispararEmailTeste}
            variant="contained"
            disabled={!emailTesteDestino.trim() || testandoEmail}
            startIcon={testandoEmail ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
          >
            {t('enviarEmailTeste')}
          </Button>
        </DialogActions>
      </Dialog>

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
