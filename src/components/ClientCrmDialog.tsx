import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';

interface ClientDocument {
  id: string;
  document_type: string;
  path: string;
  original_filename: string;
  created_at: string;
}

interface ClientInteraction {
  id: string;
  interaction_text: string;
  observation?: string;
  interaction_type: string;
  created_at: string;
}

interface ClientCrmDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

const documentTypes = [
  'CNH',
  'Comprovante de Residência',
  'RG',
  'CPF',
  'Foto do Contrato',
  'Seguro',
  'Documentação do Veículo',
  'Outro'
];

const ClientCrmDialog = ({ open, onClose, clientId, clientName }: ClientCrmDialogProps) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState('CNH');
  const [interactionText, setInteractionText] = useState('');
  const [interactionObservation, setInteractionObservation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      fetchDocuments();
      fetchInteractions();
    }
  }, [open, clientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/clients/${clientId}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      setError('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async () => {
    try {
      const response = await axios.get(`/api/clients/${clientId}/interactions`);
      setInteractions(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar interações:', error);
      setError('Erro ao carregar histórico de atendimento');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');

      // Validação no frontend - apenas JPG, PNG e PDF
      const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!allowedMimes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        throw new Error('Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo 10MB.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const response = await axios.post(
        `/api/clients/${clientId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setDocuments([response.data, ...documents]);
      setSuccess('Documento enviado com sucesso');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      setError(error.response?.data?.message || error.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      // Limpar input
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este documento?')) return;

    try {
      await axios.delete(`/api/clients/${clientId}/documents/${documentId}`);
      setDocuments(documents.filter(d => d.id !== documentId));
      setSuccess('Documento deletado com sucesso');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      setError('Erro ao deletar documento');
    }
  };

  const handleAddInteraction = async () => {
    if (!interactionText.trim()) {
      setError('Digite o texto da interação');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const response = await axios.post(
        `/api/clients/${clientId}/interactions`,
        {
          interactionText,
          observation: interactionObservation || undefined,
          interactionType: 'atendimento'
        }
      );

      setInteractions([response.data, ...interactions]);
      setInteractionText('');
      setInteractionObservation('');
      setSuccess('Interação registrada com sucesso');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Erro ao registrar interação:', error);
      setError(error.response?.data?.message || 'Erro ao registrar interação');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon sx={{ mr: 1 }} />;
    }
    return <DescriptionIcon sx={{ mr: 1 }} />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>CRM - {clientName}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Seção de Upload de Documentos */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Gestão de Documentos</Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Tipo de Documento</InputLabel>
              <Select
                value={documentType}
                label="Tipo de Documento"
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={uploading}
              >
                {documentTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              component="label"
              disabled={uploading}
            >
              {uploading ? 'Enviando...' : 'Enviar Arquivo'}
              <input
                hidden
                accept="image/*,.pdf"
                type="file"
                onChange={handleFileUpload}
              />
            </Button>
          </Box>

          {loading ? (
            <CircularProgress />
          ) : documents.length > 0 ? (
            <Paper sx={{ p: 2 }}>
              <List sx={{ width: '100%' }}>
                {documents.map((doc, index) => (
                  <Box key={doc.id}>
                    <ListItem>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        {getFileIcon(doc.original_filename)}
                        <ListItemText
                          primary={doc.document_type}
                          secondary={`${doc.original_filename} - ${new Date(doc.created_at).toLocaleDateString('pt-BR')}`}
                        />
                      </Box>
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < documents.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          ) : (
            <Typography variant="body2" color="textSecondary">Nenhum documento cadastrado</Typography>
          )}
        </Box>

        {/* Seção de Histórico de Atendimento */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Histórico de Atendimento (CRM)</Typography>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Descrever atendimento"
              multiline
              rows={2}
              value={interactionText}
              onChange={(e) => setInteractionText(e.target.value)}
              disabled={uploading}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              label="Observações adicionais (opcional)"
              multiline
              rows={2}
              value={interactionObservation}
              onChange={(e) => setInteractionObservation(e.target.value)}
              disabled={uploading}
              sx={{ mb: 1 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleAddInteraction}
              disabled={uploading || !interactionText.trim()}
            >
              {uploading ? 'Registrando...' : 'Registrar Atendimento'}
            </Button>
          </Box>

          {interactions.length > 0 ? (
            <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
              <List sx={{ width: '100%' }}>
                {interactions.map((interaction, index) => (
                  <Box key={interaction.id}>
                    <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <ListItemText
                        primary={interaction.interaction_text}
                        secondary={`${new Date(interaction.created_at).toLocaleDateString('pt-BR')} ${new Date(interaction.created_at).toLocaleTimeString('pt-BR')}`}
                      />
                      {interaction.observation && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1, ml: 2 }}>
                          Obs: {interaction.observation}
                        </Typography>
                      )}
                    </ListItem>
                    {index < interactions.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          ) : (
            <Typography variant="body2" color="textSecondary">Nenhum atendimento registrado</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientCrmDialog;
