import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, TextField, IconButton,
  CircularProgress, Grid, Card, CardMedia, CardContent, CardActions,
  Tooltip, Alert, Snackbar,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useLanguage } from './LanguageContext';

interface Documento {
  id: string;
  entityId: string;
  entityType: string;
  filename: string;
  anotacao: string;
  dataUpload: string;
  caminho?: string;
  filePath?: string;
  base64?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'cliente' | 'veiculo';
  entityNome: string;
}

// Redimensiona a imagem para max 1200px antes de salvar como base64
const resizeImage = (file: File, maxWidth = 1200, quality = 0.85): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const DocumentosDialog = ({ open, onClose, entityId, entityType, entityNome }: Props) => {
  const { t } = useLanguage();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [anotacoes, setAnotacoes] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false, message: '', severity: 'success' as 'success' | 'error',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backendBaseUrl = import.meta.env.DEV
    ? 'http://localhost:3001'
    : window.location.origin;

  const resolveFileUrl = (doc: Documento) => {
    const fileUrl = doc.caminho || doc.base64 || doc.filePath || '';
    if (!fileUrl) return '';
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${backendBaseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
  };

  const isPdfFile = (url: string, filename?: string) => {
    const byUrl = /\.pdf($|\?)/i.test(url);
    const byName = /\.pdf$/i.test(filename || '');
    return byUrl || byName;
  };

  const fetchDocs = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/documentos/${entityType}/${entityId}`);
      const docs: Documento[] = res.data;
      setDocumentos(docs);
      const map: Record<string, string> = {};
      docs.forEach(d => { map[d.id] = d.anotacao; });
      setAnotacoes(map);
    } catch {
      setSnackbar({ open: true, message: t('erroCarregarDocumentos'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, t]);

  useEffect(() => {
    if (open) fetchDocs();
  }, [open, fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const base64 = await resizeImage(file);
        await axios.post('/api/documentos', {
          entityId,
          entityType,
          base64,
          filename: file.name,
          anotacao: '',
          dataUpload: new Date().toISOString(),
        });
      }
      await fetchDocs();
      setSnackbar({ open: true, message: `${files.length} ${t('uploadSucesso')}`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('erroUpload'), severity: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveAnotacao = async (doc: Documento) => {
    try {
      const novaAnotacao = anotacoes[doc.id] ?? '';
      await axios.put(`/api/documentos/${doc.id}`, { ...doc, anotacao: novaAnotacao });
      setDocumentos(prev => prev.map(d => d.id === doc.id ? { ...d, anotacao: novaAnotacao } : d));
      setSnackbar({ open: true, message: t('anotacaoSalva'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('erroSalvarAnotacao'), severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/documentos/${id}`);
      setDocumentos(prev => prev.filter(d => d.id !== id));
      setSnackbar({ open: true, message: t('documentoExcluido'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('erroExcluirDocumento'), severity: 'error' });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">{t('documentosTitulo')} — {entityNome}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* Área de upload */}
          <Box
            onClick={() => !uploading && fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 2,
              p: 3,
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              cursor: uploading ? 'not-allowed' : 'pointer',
              bgcolor: 'rgba(25,118,210,0.04)',
              '&:hover': { bgcolor: 'rgba(25,118,210,0.09)' },
              transition: 'background 0.2s',
            }}
          >
            {uploading ? (
              <>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">{t('processandoImagens')}</Typography>
              </>
            ) : (
              <>
                <AddPhotoAlternateIcon color="primary" sx={{ fontSize: 44 }} />
                <Typography variant="body1" fontWeight={600}>{t('cliqueAdicionarFotos')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('multiplasImagens')}
                </Typography>
              </>
            )}
          </Box>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />

          {/* Grade de documentos */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : documentos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              {t('nenhumDocumento')}
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {documentos.map(doc => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                      const fileUrl = resolveFileUrl(doc);
                      const isPdf = isPdfFile(fileUrl, doc.filename);

                      if (!fileUrl) {
                        return (
                          <Box
                            sx={{
                              height: 170,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: '#f5f5f5',
                              color: 'text.secondary',
                              px: 2,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="body2">Arquivo indisponível</Typography>
                          </Box>
                        );
                      }

                      if (isPdf) {
                        return (
                          <Box sx={{ height: 170, bgcolor: '#f5f5f5' }}>
                            <iframe
                              src={fileUrl}
                              title={doc.filename}
                              style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                          </Box>
                        );
                      }

                      return (
                        <CardMedia
                          component="img"
                          image={fileUrl}
                          alt={doc.filename}
                          sx={{ height: 170, objectFit: 'cover', cursor: 'zoom-in' }}
                          onClick={() => setLightbox(fileUrl)}
                        />
                      );
                    })()}
                    <CardContent sx={{ flexGrow: 1, pb: 0 }}>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ mb: 0.5 }}>
                        {doc.filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label={t('anotacao')}
                        value={anotacoes[doc.id] ?? ''}
                        onChange={e => setAnotacoes(prev => ({ ...prev, [doc.id]: e.target.value }))}
                        placeholder={`${t('anotacao')}...`}
                      />
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 1.5, pb: 1, pt: 0.5 }}>
                      <Tooltip title={t('salvarAnotacao')}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSaveAnotacao(doc)}
                            disabled={(anotacoes[doc.id] ?? '') === doc.anotacao}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Box>
                        <Tooltip title="Visualizar">
                          <IconButton
                            size="small"
                            disabled={!resolveFileUrl(doc)}
                            onClick={() => {
                              const fileUrl = resolveFileUrl(doc);
                              if (fileUrl) {
                                window.open(fileUrl, '_blank');
                              }
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('ampliar')}>
                          <IconButton
                            size="small"
                            disabled={!resolveFileUrl(doc) || isPdfFile(resolveFileUrl(doc), doc.filename)}
                            onClick={() => {
                              const fileUrl = resolveFileUrl(doc);
                              if (fileUrl && !isPdfFile(fileUrl, doc.filename)) {
                                setLightbox(fileUrl);
                              }
                            }}
                          >
                            <ZoomInIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" color="error" onClick={() => handleDelete(doc.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="inherit">{t('fechar')}</Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {t('adicionarFotos')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setLightbox(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center', bgcolor: '#111' }}>
          {lightbox && (
            <img
              src={lightbox}
              alt={t('ampliar')}
              style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DocumentosDialog;
