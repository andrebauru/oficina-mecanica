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
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

interface Documento {
  id: string;
  entityId: string;
  entityType: string;
  base64: string;
  filename: string;
  anotacao: string;
  dataUpload: string;
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
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [anotacoes, setAnotacoes] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false, message: '', severity: 'success' as 'success' | 'error',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/documentos?entityId=${entityId}&entityType=${entityType}`
      );
      const docs: Documento[] = res.data;
      setDocumentos(docs);
      const map: Record<string, string> = {};
      docs.forEach(d => { map[d.id] = d.anotacao; });
      setAnotacoes(map);
    } catch {
      setSnackbar({ open: true, message: 'Erro ao carregar documentos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

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
      setSnackbar({ open: true, message: `${files.length} imagem(ns) adicionada(s)`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Erro ao fazer upload', severity: 'error' });
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
      setSnackbar({ open: true, message: 'Anotação salva', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Erro ao salvar anotação', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/documentos/${id}`);
      setDocumentos(prev => prev.filter(d => d.id !== id));
      setSnackbar({ open: true, message: 'Documento excluído', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Erro ao excluir documento', severity: 'error' });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">Documentos — {entityNome}</Typography>
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
                <Typography variant="body2" color="text.secondary">Processando imagens...</Typography>
              </>
            ) : (
              <>
                <AddPhotoAlternateIcon color="primary" sx={{ fontSize: 44 }} />
                <Typography variant="body1" fontWeight={600}>Clique para adicionar fotos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Múltiplas imagens suportadas · JPG, PNG, WEBP, HEIC
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
              Nenhum documento adicionado ainda.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {documentos.map(doc => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component="img"
                      image={doc.base64}
                      alt={doc.filename}
                      sx={{ height: 170, objectFit: 'cover', cursor: 'zoom-in' }}
                      onClick={() => setLightbox(doc.base64)}
                    />
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
                        label="Anotação"
                        value={anotacoes[doc.id] ?? ''}
                        onChange={e => setAnotacoes(prev => ({ ...prev, [doc.id]: e.target.value }))}
                        placeholder="Adicione uma anotação..."
                      />
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 1.5, pb: 1, pt: 0.5 }}>
                      <Tooltip title="Salvar anotação">
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
                        <Tooltip title="Ampliar">
                          <IconButton size="small" onClick={() => setLightbox(doc.base64)}>
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
          <Button onClick={onClose} color="inherit">Fechar</Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Adicionar Fotos
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
              alt="Documento ampliado"
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
