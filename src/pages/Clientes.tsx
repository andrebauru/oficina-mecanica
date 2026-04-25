import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  TableSortLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DocumentosDialog from '../components/DocumentosDialog';
import ClientCrmDialog from '../components/ClientCrmDialog';
import ContratoVendaDialog from '../components/ContratoVendaDialog';
import { useLanguage } from '../components/LanguageContext';

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  cnh_number?: string;
  observacoes_gerais?: string;
}

interface ClienteFormData {
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  cnh_number: string;
  observacoes_gerais: string;
  documento1?: File;
  documento2?: File;
}

const clienteVazio: ClienteFormData = {
  nome: '',
  email: '',
  telefone: '',
  endereco: '',
  cnh_number: '',
  observacoes_gerais: ''
};

const Clientes = () => {
  const { t } = useLanguage();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [formData, setFormData] = useState<ClienteFormData>(clienteVazio);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clienteParaDeletar, setClienteParaDeletar] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [openDocs, setOpenDocs] = useState(false);
  const [docsCliente, setDocsCliente] = useState<{ id: string; nome: string } | null>(null);
  const [openCrm, setOpenCrm] = useState(false);
  const [crmCliente, setCrmCliente] = useState<{ id: string; nome: string } | null>(null);
  const [openContratoVenda, setOpenContratoVenda] = useState(false);
  const [contratoVendaCliente, setContratoVendaCliente] = useState<{ id: string; nome: string } | null>(null);

  const [filtro, setFiltro] = useState('');
  const [ordenacao, setOrdenacao] = useState<{
    campo: keyof Cliente | '';
    direcao: 'asc' | 'desc';
  }>({
    campo: '',
    direcao: 'asc'
  });

  // Refs para inputs de arquivo
  const documento1Ref = useRef<HTMLInputElement>(null);
  const documento2Ref = useRef<HTMLInputElement>(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/clientes');
      setClientes(response.data);
      setClientesFiltrados(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar clientes',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleOpenForm = (cliente?: Cliente) => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        endereco: cliente.endereco,
        cnh_number: cliente.cnh_number || '',
        observacoes_gerais: cliente.observacoes_gerais || ''
      });
      setEditingId(cliente.id);
    } else {
      setFormData(clienteVazio);
      setEditingId(null);
    }
    // Limpar inputs de arquivo
    if (documento1Ref.current) documento1Ref.current.value = '';
    if (documento2Ref.current) documento2Ref.current.value = '';
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'documento1' | 'documento2') => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Preparar dados do cliente (sem os arquivos)
      const clienteData: ClienteFormData = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco,
        cnh_number: formData.cnh_number,
        observacoes_gerais: formData.observacoes_gerais
      };

      let clienteId = editingId;

      if (editingId) {
        await axios.put(`/api/clientes/${editingId}`, clienteData);
        setSnackbar({
          open: true,
          message: 'Cliente atualizado com sucesso',
          severity: 'success'
        });
      } else {
        const response = await axios.post('/api/clientes', clienteData);
        clienteId = response.data?.id;
        setSnackbar({
          open: true,
          message: 'Cliente adicionado com sucesso',
          severity: 'success'
        });
      }

      // Upload de documentos se fornecidos
      if (clienteId && (formData.documento1 || formData.documento2)) {
        try {
          const uploadDocumento = async (file: File, categoria: string, anotacao: string) => {
            return new Promise<void>((resolve) => {
              const reader = new FileReader();
              reader.onload = async (event) => {
                try {
                  const base64 = (event.target?.result as string)?.split(',')[1];
                  if (base64) {
                    await axios.post('/api/documentos', {
                      entityId: clienteId,
                      entityType: 'cliente',
                      base64,
                      filename: file.name,
                      anotacao,
                      categoria,
                      dataUpload: new Date().toISOString()
                    });
                  }
                } catch (err) {
                  console.error(`Erro ao fazer upload de ${categoria}:`, err);
                } finally {
                  resolve();
                }
              };
              reader.onerror = () => resolve();
              reader.readAsDataURL(file);
            });
          };

          if (formData.documento1) {
            await uploadDocumento(formData.documento1, 'menkyo', 'Menkyo (Documento 1)');
          }

          if (formData.documento2) {
            await uploadDocumento(formData.documento2, 'zairyu', 'Zairyu (Documento 2)');
          }
        } catch (uploadError) {
          console.error('Erro durante upload de documentos:', uploadError);
          // Não bloqueia o fluxo se falhar o upload
        }
      }

      handleCloseForm();
      fetchClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar cliente',
        severity: 'error'
      });
    }
  };

  const handleOpenDelete = (id: string) => {
    setClienteParaDeletar(id);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
  };

  const handleDelete = async () => {
    if (clienteParaDeletar) {
      try {
        await axios.delete(`/api/clientes/${clienteParaDeletar}`);
        setSnackbar({
          open: true,
          message: 'Cliente excluído com sucesso',
          severity: 'success'
        });
        fetchClientes();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir cliente',
          severity: 'error'
        });
      }
      handleCloseDelete();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleOpenDocs = (cliente: Cliente) => {
    setDocsCliente({ id: cliente.id, nome: cliente.nome });
    setOpenDocs(true);
  };

  const handleOpenCrm = (cliente: Cliente) => {
    setCrmCliente({ id: cliente.id, nome: cliente.nome });
    setOpenCrm(true);
  };

  const handleOpenContratoVenda = (cliente: Cliente) => {
    setContratoVendaCliente({ id: cliente.id, nome: cliente.nome });
    setOpenContratoVenda(true);
  };

  const handleFiltroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(event.target.value.toLowerCase());
  };

  const handleOrdenacaoChange = (campo: keyof Cliente) => {
    const ehMesmoCampo = ordenacao.campo === campo;
    const novaDirecao = ehMesmoCampo && ordenacao.direcao === 'asc' ? 'desc' : 'asc';
    setOrdenacao({ campo, direcao: novaDirecao });
  };

  // Derivar clientesFiltrados a partir dos dados base, filtro e ordenação
  useEffect(() => {
    let resultado = [...clientes];

    if (filtro) {
      resultado = resultado.filter(cliente =>
        cliente.nome.toLowerCase().includes(filtro) ||
        cliente.email.toLowerCase().includes(filtro) ||
        cliente.telefone.toLowerCase().includes(filtro) ||
        cliente.endereco.toLowerCase().includes(filtro) ||
        (cliente.cnh_number && cliente.cnh_number.toLowerCase().includes(filtro))
      );
    }

    if (ordenacao.campo !== '') {
      const campoOrdenacao = ordenacao.campo as keyof Cliente;
      resultado = [...resultado].sort((a, b) => {
        const valorA = a[campoOrdenacao] ?? '';
        const valorB = b[campoOrdenacao] ?? '';
        if (valorA < valorB) return ordenacao.direcao === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenacao.direcao === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setClientesFiltrados(resultado);
  }, [clientes, filtro, ordenacao.campo, ordenacao.direcao]);

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        mb: 3,
      }}>
        <Typography variant="h4" gutterBottom sx={{ m: 0 }}>
          {t('clientes_titulo')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          {t('novoCliente')}
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder={`${t('buscarPlaceholder')} ${t('clientes_titulo').toLowerCase()}`}
        value={filtro}
        onChange={handleFiltroChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'nome'}
                    direction={ordenacao.campo === 'nome' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('nome')}
                  >
                    {t('nome')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'email'}
                    direction={ordenacao.campo === 'email' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('email')}
                  >
                    {t('email')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'telefone'}
                    direction={ordenacao.campo === 'telefone' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('telefone')}
                  >
                    {t('telefone')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>{t('endereco')}</TableCell>
                <TableCell align="center">{t('acao')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientesFiltrados.map(cliente => (
                <TableRow
                  key={cliente.id}
                  onClick={() => handleOpenForm(cliente)}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(25,118,210,0.06)' } }}
                >
                  <TableCell>{cliente.nome}</TableCell>
                  <TableCell>{cliente.email}</TableCell>
                  <TableCell>{cliente.telefone}</TableCell>
                  <TableCell>{cliente.endereco}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={(e) => { e.stopPropagation(); handleOpenCrm(cliente); }} color="info" title="CRM - Documentos e Histórico">
                      <AssignmentIcon />
                    </IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); handleOpenContratoVenda(cliente); }} color="success" title="Gerar Contrato de Venda">
                      📄
                    </IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); handleOpenDocs(cliente); }} color="secondary" title={t('documentosFotos')}>
                      <PhotoLibraryIcon />
                    </IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); handleOpenForm(cliente); }} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); handleOpenDelete(cliente.id); }} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Formulário de Cliente */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? `${t('editar')} ${t('cliente')}` : t('novoCliente')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="nome"
            label={t('nome')}
            type="text"
            fullWidth
            variant="outlined"
            value={formData.nome}
            onChange={handleInputChange}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            name="email"
            label={t('email')}
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="telefone"
            label={t('telefone')}
            type="tel"
            fullWidth
            variant="outlined"
            value={formData.telefone}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="endereco"
            label={t('endereco')}
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.endereco}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="cnh_number"
            label="Número da CNH"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.cnh_number}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="observacoes_gerais"
            label="Observações Gerais"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.observacoes_gerais}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mt: 3, mb: 2, p: 1.5, border: '1px solid #ddd', borderRadius: 1, bgcolor: '#f9f9f9' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Documentos (Opcional)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <input
                ref={documento1Ref}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'documento1')}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => documento1Ref.current?.click()}
                sx={{ mb: 1 }}
              >
                {formData.documento1 ? `✓ ${formData.documento1.name}` : 'Menkyo (Documento 1)'}
              </Button>
            </Box>
            <Box>
              <input
                ref={documento2Ref}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'documento2')}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => documento2Ref.current?.click()}
              >
                {formData.documento2 ? `✓ ${formData.documento2.name}` : 'Zairyu (Documento 2)'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} color="inherit">
            {t('cancelar')}
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {t('salvar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={openDelete} onClose={handleCloseDelete}>
        <DialogTitle>{t('confirmarDelecao')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('confirmarDelecao')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit">
            {t('cancelar')}
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('deletar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Documentos */}
      {docsCliente && (
        <DocumentosDialog
          open={openDocs}
          onClose={() => setOpenDocs(false)}
          entityId={docsCliente.id}
          entityType="cliente"
          entityNome={docsCliente.nome}
        />
      )}

      {/* CRM Dialog */}
      {crmCliente && (
        <ClientCrmDialog
          open={openCrm}
          onClose={() => setOpenCrm(false)}
          clientId={crmCliente.id}
          clientName={crmCliente.nome}
        />
      )}

      {/* Contrato de Venda Dialog */}
      {contratoVendaCliente && (
        <ContratoVendaDialog
          open={openContratoVenda}
          onClose={() => setOpenContratoVenda(false)}
          clienteId={contratoVendaCliente.id}
          clienteNome={contratoVendaCliente.nome}
          veiculoId=""
          veiculoInfo="Selecionar veículo"
        />
      )}

      {/* Snackbar para mensagens */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Clientes;