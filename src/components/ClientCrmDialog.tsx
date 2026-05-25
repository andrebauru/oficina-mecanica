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
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildIcon from '@mui/icons-material/Build';

interface ClientDocument {
  id: string;
  categoria?: string;
  caminho?: string;
  filePath?: string;
  base64?: string;
  fileType?: string;
  filename?: string;
  dataUpload?: string;
}

interface ClientInteraction {
  id: string;
  interaction_text: string;
  observation?: string;
  interaction_type: string;
  created_at: string;
}

interface VeiculoComprado {
  id: string;
  fabricante: string;
  modelo: string;
  ano?: number;
  valorTotal?: number;
  dataVenda?: string;
  contratoPath?: string;
}

interface OrdemServico {
  id: string;
  dataEntrada: string;
  status: string;
  valorTotal?: number;
  marca?: string;
  modelo?: string;
  placa?: string;
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 0 }).format(Number(value || 0));

const ClientCrmDialog = ({ open, onClose, clientId, clientName }: ClientCrmDialogProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [veiculosComprados, setVeiculosComprados] = useState<VeiculoComprado[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState('CNH');
  const [interactionText, setInteractionText] = useState('');
  const [interactionObservation, setInteractionObservation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const backendBaseUrl = axios.defaults.baseURL
    || import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

  useEffect(() => {
    if (open) {
      fetchDocuments();
      fetchInteractions();
      fetchHistory();
    }
  }, [open, clientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/documentos/cliente/${clientId}`);
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

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await axios.get(`/api/clients/${clientId}/history`);
      setVeiculosComprados(response.data.veiculosComprados || []);
      setOrdensServico(response.data.ordensServico || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');

      const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!allowedMimes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        throw new Error('Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo 10MB.');
      }

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      const response = await axios.post('/api/documentos', {
        entityId: clientId,
        entityType: 'cliente',
        base64: base64Data,
        filename: file.name,
        fileType: file.type,
        categoria: documentType,
        dataUpload: new Date().toISOString(),
      });

      setDocuments([response.data, ...documents]);
      setSuccess('Documento enviado com sucesso');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      setError(error.response?.data?.message || error.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este documento?')) return;

    try {
      await axios.delete(`/api/documentos/${documentId}`);
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

  const resolveFileUrl = (doc: ClientDocument) => {
    let fileUrl = doc.caminho || doc.filePath || doc.base64 || '';
    if (!fileUrl) return '';
    if (fileUrl.startsWith('/uploads')) fileUrl = `/api${fileUrl}`;
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${backendBaseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
  };

  const handleView = (fileUrl: string) => window.open(fileUrl, '_blank');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>CRM - {clientName}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {error && <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mx: 2, mt: 2 }}>{success}</Alert>}

        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Anotações (CRM)" />
          <Tab label="Documentos" />
          <Tab label={`Veículos Comprados (${veiculosComprados.length})`} icon={<DirectionsCarIcon fontSize="small" />} iconPosition="start" />
          <Tab label={`Ordens de Serviço (${ordensServico.length})`} icon={<BuildIcon fontSize="small" />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* TAB 0 — Anotações CRM */}
          {activeTab === 0 && (
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
          )}

          {/* TAB 1 — Documentos */}
          {activeTab === 1 && (
            <Box>
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
                  <input hidden accept="image/*,.pdf" type="file" onChange={handleFileUpload} />
                </Button>
              </Box>

              {loading ? (
                <CircularProgress />
              ) : documents.length > 0 ? (
                <Paper sx={{ p: 2 }}>
                  <List sx={{ width: '100%' }}>
                    {documents.map((doc, index) => {
                      const fileUrl = resolveFileUrl(doc);
                      const displayName = doc.filename || 'arquivo';
                      const createdAt = doc.dataUpload || '';
                      return (
                        <Box key={doc.id}>
                          <ListItem>
                            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                              {getFileIcon(displayName)}
                              <ListItemText
                                primary={doc.categoria || 'Documento'}
                                secondary={`${displayName}${createdAt ? ` - ${new Date(createdAt).toLocaleDateString('pt-BR')}` : ''}`}
                              />
                            </Box>
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                sx={{ mr: 0.5 }}
                                disabled={!fileUrl}
                                onClick={() => { if (fileUrl) handleView(fileUrl); }}
                              >
                                <VisibilityIcon />
                              </IconButton>
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
                      );
                    })}
                  </List>
                </Paper>
              ) : (
                <Typography variant="body2" color="textSecondary">Nenhum documento cadastrado</Typography>
              )}
            </Box>
          )}

          {/* TAB 2 — Veículos Comprados */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Veículos Comprados</Typography>
              {historyLoading ? (
                <CircularProgress />
              ) : veiculosComprados.length === 0 ? (
                <Typography variant="body2" color="textSecondary">Nenhum veículo comprado registrado.</Typography>
              ) : (
                <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 480 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Veículo</strong></TableCell>
                        <TableCell><strong>Data</strong></TableCell>
                        <TableCell align="right"><strong>Valor Total</strong></TableCell>
                        <TableCell align="center"><strong>Contrato</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {veiculosComprados.map((vc) => (
                        <TableRow key={vc.id} hover>
                          <TableCell>
                            {vc.fabricante} {vc.modelo}
                            {vc.ano ? <Typography variant="caption" display="block" color="text.secondary">{vc.ano}</Typography> : null}
                          </TableCell>
                          <TableCell>
                            {vc.dataVenda ? new Date(vc.dataVenda).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell align="right">
                            {vc.valorTotal ? formatCurrency(vc.valorTotal) : '—'}
                          </TableCell>
                          <TableCell align="center">
                            {vc.contratoPath ? (
                              <Chip
                                label="Ver Contrato"
                                size="small"
                                color="primary"
                                variant="outlined"
                                clickable
                                icon={<DescriptionIcon />}
                                onClick={() => window.open(`/api/vendas_carros/${vc.id}/contracts/view`, '_blank')}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* TAB 3 — Ordens de Serviço */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Ordens de Serviço</Typography>
              {historyLoading ? (
                <CircularProgress />
              ) : ordensServico.length === 0 ? (
                <Typography variant="body2" color="textSecondary">Nenhuma ordem de serviço registrada.</Typography>
              ) : (
                <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 480 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Veículo</strong></TableCell>
                        <TableCell><strong>Data</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="right"><strong>Valor OS</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ordensServico.map((os) => (
                        <TableRow key={os.id} hover>
                          <TableCell>
                            {os.marca || os.modelo
                              ? `${os.marca || ''} ${os.modelo || ''}`.trim()
                              : '—'}
                            {os.placa && (
                              <Typography variant="caption" display="block" color="text.secondary">{os.placa}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {os.dataEntrada ? new Date(os.dataEntrada).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={os.status}
                              size="small"
                              color={os.status === 'Concluído' || os.status === 'Entregue' ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {os.valorTotal ? formatCurrency(os.valorTotal) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
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
