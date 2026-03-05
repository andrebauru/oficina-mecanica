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
  TableSortLabel,
  Grid,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';

interface VendaCarro {
  id: number;
  valor: number;
  fabricante: string;
  modelo: string;
  ano: number;
  kilometragem: number;
  parcelas: number;
  juros: number;
  valorTotal: number;
  parcelasStatus?: boolean[];
}

interface VendaCarroFormData {
  valor: number | '';
  fabricante: string;
  modelo: string;
  ano: number | '';
  kilometragem: number | '';
  parcelas: number | '';
  juros: number | '';
}

const vendaCarroVazio: VendaCarroFormData = {
  valor: '',
  fabricante: '',
  modelo: '',
  ano: '',
  kilometragem: '',
  parcelas: 1,
  juros: 0
};

const VendasCarros = () => {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const [vendasCarros, setVendasCarros] = useState<VendaCarro[]>([]);
  const [vendasCarrosFiltradas, setVendasCarrosFiltradas] = useState<VendaCarro[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [formData, setFormData] = useState<VendaCarroFormData>(vendaCarroVazio);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [vendaCarroParaDeletar, setVendaCarroParaDeletar] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [filtro, setFiltro] = useState('');
  const [ordenacao, setOrdenacao] = useState<{
    campo: keyof VendaCarro | '';
    direcao: 'asc' | 'desc';
  }>({
    campo: '',
    direcao: 'asc'
  });

  // Cálculo automático de valorTotal e valorParcela
  const valorBase = Number(formData.valor) || 0;
  const taxaJuros = Number(formData.juros) || 0;
  const numParcelas = Number(formData.parcelas) || 1;
  const valorTotal = valorBase * (1 + taxaJuros / 100);
  const valorParcela = numParcelas > 0 ? valorTotal / numParcelas : valorTotal;

  const fetchVendasCarros = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/vendas_carros');
      setVendasCarros(response.data);
    } catch (error) {
      console.error('Erro ao buscar vendas de carros:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar vendas de carros',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendasCarros();
  }, []);

  useEffect(() => {
    if (!loading && highlightId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [loading, highlightId]);

  const handleOpenForm = (vendaCarro?: VendaCarro) => {
    if (vendaCarro) {
      setFormData({
        valor: vendaCarro.valor,
        fabricante: vendaCarro.fabricante,
        modelo: vendaCarro.modelo,
        ano: vendaCarro.ano,
        kilometragem: vendaCarro.kilometragem,
        parcelas: vendaCarro.parcelas ?? 1,
        juros: vendaCarro.juros ?? 0
      });
      setEditingId(vendaCarro.id);
    } else {
      setFormData(vendaCarroVazio);
      setEditingId(null);
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['valor', 'ano', 'kilometragem', 'parcelas', 'juros'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async () => {
    try {
      const newParcelas = Number(formData.parcelas) || 1;
      const vendaAntiga = editingId ? vendasCarros.find(v => v.id === editingId) : undefined;
      const existingStatus = vendaAntiga?.parcelasStatus ?? [];
      const parcelasStatus = Array.from({ length: newParcelas }, (_, i) => existingStatus[i] ?? false);

      const dataToSubmit = {
        ...formData,
        valor: Number(formData.valor),
        ano: Number(formData.ano),
        kilometragem: Number(formData.kilometragem),
        parcelas: newParcelas,
        juros: Number(formData.juros) || 0,
        valorTotal,
        parcelasStatus
      };

      if (editingId) {
        await axios.put(`http://localhost:3001/vendas_carros/${editingId}`, dataToSubmit);
        setSnackbar({
          open: true,
          message: 'Venda de carro atualizada com sucesso',
          severity: 'success'
        });
      } else {
        await axios.post('http://localhost:3001/vendas_carros', dataToSubmit);
        setSnackbar({
          open: true,
          message: 'Venda de carro adicionada com sucesso',
          severity: 'success'
        });
      }
      handleCloseForm();
      fetchVendasCarros();
    } catch (error) {
      console.error('Erro ao salvar venda de carro:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar venda de carro',
        severity: 'error'
      });
    }
  };

  const handleOpenDelete = (id: number) => {
    setVendaCarroParaDeletar(id);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
  };

  const handleDelete = async () => {
    if (vendaCarroParaDeletar) {
      try {
        await axios.delete(`http://localhost:3001/vendas_carros/${vendaCarroParaDeletar}`);
        setSnackbar({
          open: true,
          message: 'Venda de carro excluída com sucesso',
          severity: 'success'
        });
        fetchVendasCarros();
      } catch (error) {
        console.error('Erro ao excluir venda de carro:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir venda de carro',
          severity: 'error'
        });
      }
      handleCloseDelete();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const isEmAtraso = (venda: VendaCarro): boolean => {
    const status = venda.parcelasStatus;
    if (!status || status.length === 0) return false;
    return status.some(s => !s);
  };

  const handleToggleParcela = async (venda: VendaCarro, index: number) => {
    const parcCount = venda.parcelas ?? 1;
    const current = venda.parcelasStatus ?? Array(parcCount).fill(false);
    const updated = [...current];
    updated[index] = !updated[index];
    try {
      await axios.patch(`http://localhost:3001/vendas_carros/${venda.id}`, { parcelasStatus: updated });
      fetchVendasCarros();
    } catch {
      setSnackbar({ open: true, message: 'Erro ao atualizar pagamento', severity: 'error' });
    }
  };

  useEffect(() => {
    let resultado = [...vendasCarros];

    if (filtro) {
      resultado = resultado.filter(venda =>
        venda.fabricante.toLowerCase().includes(filtro) ||
        venda.modelo.toLowerCase().includes(filtro) ||
        String(venda.ano).includes(filtro) ||
        String(venda.kilometragem).includes(filtro) ||
        String(venda.valor).includes(filtro)
      );
    }

    if (ordenacao.campo !== '') {
      const campo = ordenacao.campo;
      resultado = [...resultado].sort((a, b) => {
        const aValue = a[campo];
        const bValue = b[campo];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return ordenacao.direcao === 'asc'
            ? aValue.localeCompare(bValue, 'pt-BR')
            : bValue.localeCompare(aValue, 'pt-BR');
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return ordenacao.direcao === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
    }

    setVendasCarrosFiltradas(resultado);
  }, [vendasCarros, filtro, ordenacao.campo, ordenacao.direcao]);

  const handleFiltroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(event.target.value.toLowerCase());
  };

  const handleOrdenacaoChange = (campo: keyof VendaCarro) => {
    const ehMesmoCampo = ordenacao.campo === campo;
    const novaDirecao = ehMesmoCampo && ordenacao.direcao === 'asc' ? 'desc' : 'asc';
    setOrdenacao({ campo, direcao: novaDirecao });
  };


  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }} gutterBottom>
          Vendas de Carros
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nova Venda de Carro
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar vendas por fabricante, modelo, ano ou quilometragem"
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
                    active={ordenacao.campo === 'valor'}
                    direction={ordenacao.campo === 'valor' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('valor')}
                  >
                    Preço Base
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'fabricante'}
                    direction={ordenacao.campo === 'fabricante' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('fabricante')}
                  >
                    Fabricante
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'modelo'}
                    direction={ordenacao.campo === 'modelo' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('modelo')}
                  >
                    Modelo
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'ano'}
                    direction={ordenacao.campo === 'ano' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('ano')}
                  >
                    Ano
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'kilometragem'}
                    direction={ordenacao.campo === 'kilometragem' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('kilometragem')}
                  >
                    Kilometragem
                  </TableSortLabel>
                </TableCell>
                <TableCell>Condições</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendasCarrosFiltradas.length > 0 ? (
                vendasCarrosFiltradas.map((vendaCarro) => {
                  const vt = vendaCarro.valorTotal ?? vendaCarro.valor;
                  const parc = vendaCarro.parcelas ?? 1;
                  const isHighlighted = highlightId === String(vendaCarro.id);
                  const emAtraso = isEmAtraso(vendaCarro);
                  return (
                    <TableRow
                      key={vendaCarro.id}
                      ref={isHighlighted ? highlightRef : null}
                      onClick={() => handleOpenForm(vendaCarro)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: isHighlighted ? '#fff9c4' : emAtraso ? '#ffebee' : undefined,
                        outline: isHighlighted ? '2px solid #f9a825' : undefined,
                        transition: 'background-color 0.3s',
                        '&:hover': { filter: 'brightness(0.96)' },
                      }}
                    >
                      <TableCell>{vendaCarro.id}</TableCell>
                      <TableCell>{formatCurrency(vendaCarro.valor)}</TableCell>
                      <TableCell>{vendaCarro.fabricante}</TableCell>
                      <TableCell>{vendaCarro.modelo}</TableCell>
                      <TableCell>{vendaCarro.ano}</TableCell>
                      <TableCell>{vendaCarro.kilometragem.toLocaleString('pt-BR')} km</TableCell>
                      <TableCell>
                        <Typography variant="body2">{vendaCarro.juros ?? 0}% juros</Typography>
                        <Typography variant="body2" fontWeight="bold">{parc}x de {formatCurrency(vt / parc)}</Typography>
                        <Typography variant="caption" color="text.secondary">Total: {formatCurrency(vt)}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {Array.from({ length: parc }).map((_, i) => {
                            const pago = (vendaCarro.parcelasStatus ?? [])[i] === true;
                            return (
                              <Chip
                                key={i}
                                label={parc === 1
                                  ? (pago ? '✓ Pago' : '✗ Pendente')
                                  : `${i + 1}ª ${pago ? '✓' : '✗'}`}
                                size="small"
                                color={pago ? 'success' : 'error'}
                                variant="outlined"
                                onClick={(e) => { e.stopPropagation(); handleToggleParcela(vendaCarro, i); }}
                                sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 22 }}
                              />
                            );
                          })}
                        </Box>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          color="primary"
                          onClick={(e) => { e.stopPropagation(); handleOpenForm(vendaCarro); }}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={(e) => { e.stopPropagation(); handleOpenDelete(vendaCarro.id); }}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Nenhuma venda de carro cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Formulário de Venda de Carro */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Venda de Carro' : 'Nova Venda de Carro'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                name="valor"
                label="Preço Base"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.valor}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="fabricante"
                label="Fabricante"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.fabricante}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="modelo"
                label="Modelo"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.modelo}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="ano"
                label="Ano"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.ano}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="kilometragem"
                label="Kilometragem"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.kilometragem}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="juros"
                label="Juros"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.juros}
                onChange={handleInputChange}
                inputProps={{ min: 0, step: 0.1 }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="parcelas"
                label="Parcelas"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.parcelas}
                onChange={handleInputChange}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Resumo financeiro</Typography>
                <Typography variant="body1">Valor Total: <strong>{formatCurrency(valorTotal)}</strong></Typography>
                <Typography variant="body1">
                  Valor por Parcela: <strong>{formatCurrency(valorParcela)}</strong>
                  {numParcelas > 1 && ` (${numParcelas}x)`}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={openDelete} onClose={handleCloseDelete}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta venda de carro? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

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

export default VendasCarros;
