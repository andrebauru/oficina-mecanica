import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useLanguage } from '../components/LanguageContext';
import { Language } from '../utils/i18n';
import { hashPassword, sanitizeText } from '../utils/security';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  idioma: Language;
  senhaHash?: string;
}

interface FormData {
  nome: string;
  email: string;
  idioma: Language;
  senha: string;
  confirmarSenha: string;
}

const Usuarios = () => {
  const { t, language } = useLanguage();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    idioma: 'pt',
    senha: '',
    confirmarSenha: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar usuários',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!editingId) {
      if (!formData.senha) {
        newErrors.senha = 'Senha é obrigatória';
      } else if (formData.senha.length < 4) {
        newErrors.senha = 'Senha deve ter ao menos 4 caracteres';
      } else if (formData.senha !== formData.confirmarSenha) {
        newErrors.confirmarSenha = 'Senhas não coincidem';
      }
    } else if (formData.senha) {
      if (formData.senha.length < 4) {
        newErrors.senha = 'Senha deve ter ao menos 4 caracteres';
      } else if (formData.senha !== formData.confirmarSenha) {
        newErrors.confirmarSenha = 'Senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenDialog = (usuario?: Usuario) => {
    if (usuario) {
      setEditingId(usuario.id);
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        idioma: usuario.idioma,
        senha: '',
        confirmarSenha: ''
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        email: '',
        idioma: language || 'pt',
        senha: '',
        confirmarSenha: ''
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({
      nome: '',
      email: '',
      idioma: 'pt',
      senha: '',
      confirmarSenha: ''
    });
    setErrors({});
  };

  const handleSaveUsuario = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { senha, confirmarSenha, ...baseData } = formData;
      const payload: Record<string, unknown> = {
        ...baseData,
        nome: sanitizeText(baseData.nome, 80),
        email: sanitizeText(baseData.email, 120),
      };
      if (senha) {
        payload.senhaHash = await hashPassword(senha);
      }

      if (editingId) {
        // Atualizar
        await axios.put(
          `/api/usuarios/${editingId}`,
          payload
        );
        setSnackbar({
          open: true,
          message: t('usuarioAtualizado'),
          severity: 'success'
        });
      } else {
        // Criar
        await axios.post('/api/usuarios', payload);
        setSnackbar({
          open: true,
          message: t('usuarioCriado'),
          severity: 'success'
        });
      }
      handleCloseDialog();
      fetchUsuarios();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setSnackbar({
        open: true,
        message: t('erroAoSalvar'),
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    setDeletingId(id);
    try {
      await axios.delete(`/api/usuarios/${id}`);
      setSnackbar({
        open: true,
        message: t('usuarioDeletado'),
        severity: 'success'
      });
      fetchUsuarios();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      setSnackbar({
        open: true,
        message: t('erroAoDeletar'),
        severity: 'error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getIdiomaLabel = (idioma: Language) => {
    if (idioma === 'pt') return t('portugues');
    if (idioma === 'vi') return t('vietnamita');
    return t('filipino');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {t('usuarios_titulo')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('novoUsuario')}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ background: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('nome')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('email')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('idioma')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('senha')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                {t('acao')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                  <Typography color="text.secondary">
                    Nenhum usuário cadastrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map(usuario => (
                <TableRow key={usuario.id} hover>
                  <TableCell>{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{getIdiomaLabel(usuario.idioma)}</TableCell>
                  <TableCell>{usuario.senhaHash ? '••••••' : '—'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(usuario)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (
                          window.confirm(t('confirmarDelecao'))
                        ) {
                          handleDeleteUsuario(usuario.id);
                        }
                      }}
                      color="error"
                      disabled={deletingId === usuario.id}
                    >
                      {deletingId === usuario.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Criar/Editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? t('editarUsuario') : t('criarUsuario')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('nome')}
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                error={!!errors.nome}
                helperText={errors.nome}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('email')}
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                error={!!errors.email}
                helperText={errors.email}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('senha')}
                type="password"
                value={formData.senha}
                onChange={e => setFormData(p => ({ ...p, senha: e.target.value }))}
                error={!!errors.senha}
                helperText={errors.senha || (!editingId ? '' : 'Deixe em branco para manter a senha atual')}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('confirmarSenha')}
                type="password"
                value={formData.confirmarSenha}
                onChange={e => setFormData(p => ({ ...p, confirmarSenha: e.target.value }))}
                error={!!errors.confirmarSenha}
                helperText={errors.confirmarSenha}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{t('idioma')}</InputLabel>
                <Select
                  value={formData.idioma}
                  label={t('idioma')}
                  onChange={e => setFormData(p => ({ ...p, idioma: e.target.value as Language }))}
                  disabled={saving}
                >
                  <MenuItem value="pt">{t('portugues')}</MenuItem>
                  <MenuItem value="fil">{t('filipino')}</MenuItem>
                  <MenuItem value="vi">{t('vietnamita')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            {t('cancelar')}
          </Button>
          <Button
            onClick={handleSaveUsuario}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {t('salvar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default Usuarios;
