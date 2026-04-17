import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  TableSortLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { SelectChangeEvent } from '@mui/material/Select';
import DocumentosDialog from '../components/DocumentosDialog';
import ContratoVendaDialog from '../components/ContratoVendaDialog';
import { useLanguage } from '../components/LanguageContext';

interface Veiculo {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  data_venda?: string;
  nova_placa?: string;
  data_transferencia?: string;
}

interface Cliente {
  id: string;
  nome: string;
}

interface VeiculoFormData {
  clienteId: string;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  data_venda?: string;
  nova_placa?: string;
  data_transferencia?: string;
}

const veiculoVazio: VeiculoFormData = {
  clienteId: '',
  marca: '',
  modelo: '',
  ano: new Date().getFullYear(),
  placa: '',
  data_venda: undefined,
  nova_placa: '',
  data_transferencia: undefined
};

const Veiculos = () => {
  const { t } = useLanguage();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [formData, setFormData] = useState<VeiculoFormData>(veiculoVazio);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [veiculoParaDeletar, setVeiculoParaDeletar] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [veiculosRes, clientesRes] = await Promise.all([
        axios.get('/api/veiculos'),
        axios.get('/api/clientes')
      ]);
      setVeiculos(veiculosRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar dados',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (veiculo?: Veiculo) => {
    if (veiculo) {
      setFormData({
        clienteId: veiculo.clienteId,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        placa: veiculo.placa,
        data_venda: veiculo.data_venda,
        nova_placa: veiculo.nova_placa,
        data_transferencia: veiculo.data_transferencia
      });
      setEditingId(veiculo.id);
    } else {
      setFormData(veiculoVazio);
      setEditingId(null);
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setFormData(veiculoVazio);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ano' ? Number(value) : value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setFormData(prev => ({
      ...prev,
      clienteId: e.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await axios.put(`/api/veiculos/${editingId}`, formData);
        setSnackbar({
          open: true,
          message: 'Veículo atualizado com sucesso',
          severity: 'success'
        });
      } else {
        await axios.post('/api/veiculos', formData);
        setSnackbar({
          open: true,
          message: 'Veículo adicionado com sucesso',
          severity: 'success'
        });
      }
      handleCloseForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar veículo',
        severity: 'error'
      });
    }
  };

  const handleOpenDelete = (id: string) => {
    setVeiculoParaDeletar(id);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setVeiculoParaDeletar(null);
  };

  const handleDelete = async () => {
    if (veiculoParaDeletar) {
      try {
        await axios.delete(`/api/veiculos/${veiculoParaDeletar}`);
        setSnackbar({
          open: true,
          message: 'Veículo excluído com sucesso',
          severity: 'success'
        });
        fetchData();
      } catch (error) {
        console.error('Erro ao excluir veículo:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir veículo',
          severity: 'error'
        });
      }
      handleCloseDelete();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getClienteNome = useCallback((clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nome : t('clienteNaoEncontrado');
  }, [clientes]);

  const [openDocs, setOpenDocs] = useState(false);
  const [docsVeiculo, setDocsVeiculo] = useState<{ id: string; nome: string } | null>(null);
  const [openContratoVenda, setOpenContratoVenda] = useState(false);
  const [contratoVendaVeiculo, setContratoVendaVeiculo] = useState<{ id: string; clienteId: string; clienteNome: string; veiculoInfo: string } | null>(null);

  const handleOpenDocs = (veiculo: Veiculo) => {
    const nome = `${veiculo.marca} ${veiculo.modelo} · ${veiculo.placa}`;
    setDocsVeiculo({ id: veiculo.id, nome });
    setOpenDocs(true);
  };

  const handleOpenContratoVenda = (veiculo: Veiculo) => {
    const clienteNome = getClienteNome(veiculo.clienteId);
    const veiculoInfo = `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
    setContratoVendaVeiculo({
      id: veiculo.id,
      clienteId: veiculo.clienteId,
      clienteNome,
      veiculoInfo
    });
    setOpenContratoVenda(true);
  };

  const [veiculosFiltrados, setVeiculosFiltrados] = useState<Veiculo[]>([]);
  const [filtro, setFiltro] = useState('');
  const [ordenacao, setOrdenacao] = useState<{
    campo: keyof Veiculo | '';
    direcao: 'asc' | 'desc';
  }>({ campo: '', direcao: 'asc' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...veiculos];

    if (filtro) {
      resultado = resultado.filter(veiculo => {
        const clienteNome = getClienteNome(veiculo.clienteId).toLowerCase();
        return (
          veiculo.marca.toLowerCase().includes(filtro) ||
          veiculo.modelo.toLowerCase().includes(filtro) ||
          veiculo.placa.toLowerCase().includes(filtro) ||
          clienteNome.includes(filtro) ||
          veiculo.ano.toString().includes(filtro)
        );
      });
    }

    if (ordenacao.campo !== '') {
      const campo = ordenacao.campo;
      resultado = [...resultado].sort((a, b) => {
        if (campo === 'clienteId') {
          const nomeA = getClienteNome(a.clienteId).toLowerCase();
          const nomeB = getClienteNome(b.clienteId).toLowerCase();
          return ordenacao.direcao === 'asc' ? nomeA.localeCompare(nomeB, 'pt-BR') : nomeB.localeCompare(nomeA, 'pt-BR');
        }
        const aValue = a[campo];
        const bValue = b[campo];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return ordenacao.direcao === 'asc' ? aValue.localeCompare(bValue, 'pt-BR') : bValue.localeCompare(aValue, 'pt-BR');
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return ordenacao.direcao === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
    }

    setVeiculosFiltrados(resultado);
  }, [veiculos, getClienteNome, filtro, ordenacao.campo, ordenacao.direcao]);

  const handleFiltroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(event.target.value.toLowerCase());
  };

  const handleOrdenacaoChange = (campo: keyof Veiculo) => {
    const ehMesmoCampo = ordenacao.campo === campo;
    const novaDirecao = ehMesmoCampo && ordenacao.direcao === 'asc' ? 'desc' : 'asc';
    setOrdenacao({ campo, direcao: novaDirecao });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }} gutterBottom>
          {t('veiculos_titulo')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          fullWidth={window.innerWidth < 600}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {t('novoVeiculo')}
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={`${t('buscarPlaceholder')} ${t('veiculos_titulo').toLowerCase()}`}
          value={filtro}
          onChange={handleFiltroChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'clienteId'}
                    direction={ordenacao.campo === 'clienteId' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('clienteId')}
                  >
                    {t('cliente')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'marca'}
                    direction={ordenacao.campo === 'marca' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('marca')}
                  >
                    {t('marca')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'modelo'}
                    direction={ordenacao.campo === 'modelo' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('modelo')}
                  >
                    {t('modelo')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'ano'}
                    direction={ordenacao.campo === 'ano' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('ano')}
                  >
                    {t('ano')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'placa'}
                    direction={ordenacao.campo === 'placa' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('placa')}
                  >
                    {t('placa')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'data_venda'}
                    direction={ordenacao.campo === 'data_venda' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('data_venda' as any)}
                  >
                    Data Venda
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'data_transferencia'}
                    direction={ordenacao.campo === 'data_transferencia' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('data_transferencia' as any)}
                  >
                    Data Transfer.
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">{t('acao')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {veiculosFiltrados.length > 0 ? (
                veiculosFiltrados.map((veiculo) => (
                  <TableRow
                    key={veiculo.id}
                    onClick={() => handleOpenForm(veiculo)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(25,118,210,0.06)' } }}
                  >
                    <TableCell>{veiculo.id}</TableCell>
                    <TableCell>{getClienteNome(veiculo.clienteId)}</TableCell>
                    <TableCell>{veiculo.marca}</TableCell>
                    <TableCell>{veiculo.modelo}</TableCell>
                    <TableCell>{veiculo.ano}</TableCell>
                    <TableCell>{veiculo.placa}</TableCell>
                    <TableCell>{veiculo.data_venda ? veiculo.data_venda.split('-').reverse().join('/') : '-'}</TableCell>
                    <TableCell>{veiculo.data_transferencia ? veiculo.data_transferencia.split('-').reverse().join('/') : '-'}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="secondary"
                        onClick={(e) => { e.stopPropagation(); handleOpenDocs(veiculo); }}
                        size="small"
                        title={t('documentosFotos')}
                      >
                        <PhotoLibraryIcon />
                      </IconButton>
                      <IconButton
                        color="success"
                        onClick={(e) => { e.stopPropagation(); handleOpenContratoVenda(veiculo); }}
                        size="small"
                        title="Gerar Contrato de Venda"
                      >
                        📄
                      </IconButton>
                      <IconButton
                        color="primary"
                        onClick={(e) => { e.stopPropagation(); handleOpenForm(veiculo); }}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={(e) => { e.stopPropagation(); handleOpenDelete(veiculo.id); }}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {t('nenhumRegistro')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Formulário de Veículo */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? `${t('editar')} ${t('veiculo')}` : t('novoVeiculo')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" sx={{ mb: 2, mt: 1 }}>
            <InputLabel id="cliente-label">{t('cliente')}</InputLabel>
            <Select
              labelId="cliente-label"
              value={formData.clienteId}
              onChange={handleSelectChange}
              label={t('cliente')}
            >
              {clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="marca"
            label={t('marca')}
            type="text"
            fullWidth
            variant="outlined"
            value={formData.marca}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="modelo"
            label={t('modelo')}
            type="text"
            fullWidth
            variant="outlined"
            value={formData.modelo}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="ano"
            label={t('ano')}
            type="number"
            fullWidth
            variant="outlined"
            value={formData.ano}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="placa"
            label={t('placa')}
            type="text"
            fullWidth
            variant="outlined"
            value={formData.placa}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="data_venda"
            label="Data de Venda (AAAA/MM/DD)"
            type="date"
            fullWidth
            variant="outlined"
            value={formData.data_venda ? new Date(formData.data_venda).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                const date = new Date(e.target.value);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setFormData(prev => ({
                  ...prev,
                  data_venda: `${year}-${month}-${day}`
                }));
              } else {
                setFormData(prev => ({
                  ...prev,
                  data_venda: undefined
                }));
              }
            }}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="dense"
            name="nova_placa"
            label="Nova Placa"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.nova_placa || ''}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="data_transferencia"
            label="Data de Transferência (AAAA/MM/DD)"
            type="date"
            fullWidth
            variant="outlined"
            value={formData.data_transferencia ? new Date(formData.data_transferencia).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                const date = new Date(e.target.value);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setFormData(prev => ({
                  ...prev,
                  data_transferencia: `${year}-${month}-${day}`
                }));
              } else {
                setFormData(prev => ({
                  ...prev,
                  data_transferencia: undefined
                }));
              }
            }}
            InputLabelProps={{ shrink: true }}
          />
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
      {docsVeiculo && (
        <DocumentosDialog
          open={openDocs}
          onClose={() => setOpenDocs(false)}
          entityId={docsVeiculo.id}
          entityType="veiculo"
          entityNome={docsVeiculo.nome}
        />
      )}

      {/* Contrato de Venda Dialog */}
      {contratoVendaVeiculo && (
        <ContratoVendaDialog
          open={openContratoVenda}
          onClose={() => setOpenContratoVenda(false)}
          clienteId={contratoVendaVeiculo.clienteId}
          clienteNome={contratoVendaVeiculo.clienteNome}
          veiculoId={contratoVendaVeiculo.id}
          veiculoInfo={contratoVendaVeiculo.veiculoInfo}
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

export default Veiculos;