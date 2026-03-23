import { useState, useEffect } from 'react';
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
import PrintIcon from '@mui/icons-material/Print'; // Ícone de impressão
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Ícone de voltar
import { formatCurrency } from '../utils/formatters'; 
import HirataLogo from '../assets/Hirata Logo.svg'; // Importar o logo
import { useLanguage } from '../components/LanguageContext';

interface Servico {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  tempoEstimado: string;
}

interface ServicoFormData {
  nome: string;
  descricao: string;
  valor: number;
  tempoEstimado: string;
}

const servicoVazio: ServicoFormData = {
  nome: '',
  descricao: '',
  valor: 0,
  tempoEstimado: ''
};

const Servicos = () => {
  const { t } = useLanguage();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicosFiltrados, setServicosFiltrados] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [formData, setFormData] = useState<ServicoFormData>(servicoVazio);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [servicoParaDeletar, setServicoParaDeletar] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [ordenacao, setOrdenacao] = useState<{
    campo: keyof Servico | '';
    direcao: 'asc' | 'desc';
  }>({
    campo: '',
    direcao: 'asc'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null); // Estado para o serviço selecionado

  const fetchServicos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/servicos');
      setServicos(response.data);
      setServicosFiltrados(response.data);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar serviços',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicos();
  }, []);

  const handleOpenForm = (servico?: Servico) => {
    if (servico) {
      setFormData({
        nome: servico.nome,
        descricao: servico.descricao,
        valor: servico.valor,
        tempoEstimado: servico.tempoEstimado
      });
      setEditingId(servico.id);
    } else {
      setFormData(servicoVazio);
      setEditingId(null);
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setFormData(servicoVazio);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'valor' ? Number(value) : value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await axios.put(`/api/servicos/${editingId}`, formData);
        setSnackbar({
          open: true,
          message: 'Serviço atualizado com sucesso',
          severity: 'success'
        });
      } else {
        await axios.post('/api/servicos', formData);
        setSnackbar({
          open: true,
          message: 'Serviço adicionado com sucesso',
          severity: 'success'
        });
      }
      handleCloseForm();
      fetchServicos();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar serviço',
        severity: 'error'
      });
    }
  };

  const handleOpenDelete = (id: string) => {
    setServicoParaDeletar(id);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setServicoParaDeletar(null);
  };

  const handleDelete = async () => {
    if (servicoParaDeletar) {
      try {
        await axios.delete(`/api/servicos/${servicoParaDeletar}`);
        setSnackbar({
          open: true,
          message: 'Serviço excluído com sucesso',
          severity: 'success'
        });
        fetchServicos();
      } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir serviço',
          severity: 'error'
        });
      }
      handleCloseDelete();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleFiltroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(event.target.value.toLowerCase());
  };

  const handleOrdenacaoChange = (campo: keyof Servico) => {
    const ehMesmoCampo = ordenacao.campo === campo;
    const novaDirecao = ehMesmoCampo && ordenacao.direcao === 'asc' ? 'desc' : 'asc';
    setOrdenacao({ campo, direcao: novaDirecao });
  };

  // Derivar servicosFiltrados a partir dos dados base, filtro e ordenação
  useEffect(() => {
    let resultado = [...servicos];

    if (filtro) {
      resultado = resultado.filter(servico =>
        servico.nome.toLowerCase().includes(filtro) ||
        servico.descricao.toLowerCase().includes(filtro) ||
        servico.valor.toString().includes(filtro) ||
        servico.tempoEstimado.toLowerCase().includes(filtro)
      );
    }

    if (ordenacao.campo !== '') {
      const campoOrdenacao = ordenacao.campo as keyof Servico;
      resultado = [...resultado].sort((a, b) => {
        if (campoOrdenacao === 'valor') {
          return ordenacao.direcao === 'asc' ? a.valor - b.valor : b.valor - a.valor;
        }
        const aValue = String(a[campoOrdenacao]).toLowerCase();
        const bValue = String(b[campoOrdenacao]).toLowerCase();
        return ordenacao.direcao === 'asc'
          ? aValue.localeCompare(bValue, 'pt-BR')
          : bValue.localeCompare(aValue, 'pt-BR');
      });
    }

    setServicosFiltrados(resultado);
  }, [servicos, filtro, ordenacao.campo, ordenacao.direcao]);

  const handlePrint = (servico: Servico) => {
    setServicoSelecionado(servico);
    setTimeout(() => {
        window.print();
    }, 500); // Pequeno atraso para garantir que o estado seja atualizado e a tela renderizada
  };

  // Efeito para reverter a seleção após a impressão
  useEffect(() => {
    const afterPrint = () => {
      setServicoSelecionado(null);
    };
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  if (servicoSelecionado) {
    return (
      <Box>
        {/* Estilos específicos para impressão */}
        <style>
        {`
          @media print {
            body {
              position: relative;
            }
            .watermark {
              display: block !important;
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              z-index: -1;
              opacity: 0.5;
              pointer-events: none;
              width: 60%;
            }
          }
        `}
        </style>
        <img src={HirataLogo} alt="Marca d'água" className="watermark" style={{ display: 'none' }} />
        
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => setServicoSelecionado(null)}
          sx={{ mb: 2, '@media print': { display: 'none' } }}
        >
          Voltar para a Lista
        </Button>
        <Typography variant="h4" gutterBottom>Detalhes do Serviço</Typography>
        <Paper sx={{p: 3, backgroundColor: 'rgba(255,255,255,0.8)'}}>
            <Typography variant="h6"><strong>Nome:</strong> {servicoSelecionado.nome}</Typography>
            <Typography sx={{mt: 1}}><strong>Descrição:</strong> {servicoSelecionado.descricao}</Typography>
            <Typography sx={{mt: 1}}><strong>Valor:</strong> {formatCurrency(servicoSelecionado.valor)}</Typography>
            <Typography sx={{mt: 1}}><strong>Tempo Estimado:</strong> {servicoSelecionado.tempoEstimado}</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }} gutterBottom>
          {t('servicos_titulo')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          fullWidth={window.innerWidth < 600}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {t('novoServico')}
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={`${t('buscarPlaceholder')} ${t('servicos_titulo').toLowerCase()}`}
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
                    active={ordenacao.campo === 'nome'}
                    direction={ordenacao.campo === 'nome' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('nome')}
                  >
                    {t('nome')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'descricao'}
                    direction={ordenacao.campo === 'descricao' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('descricao')}
                  >
                    {t('descricao')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'valor'}
                    direction={ordenacao.campo === 'valor' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('valor')}
                  >
                    {t('valor')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={ordenacao.campo === 'tempoEstimado'}
                    direction={ordenacao.campo === 'tempoEstimado' ? ordenacao.direcao : 'asc'}
                    onClick={() => handleOrdenacaoChange('tempoEstimado')}
                  >
                    {t('tempoEstimado')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">{t('acao')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {servicosFiltrados.length > 0 ? (
                servicosFiltrados.map((servico) => (
                  <TableRow
                    key={servico.id}
                    onClick={() => handleOpenForm(servico)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(25,118,210,0.06)' } }}
                  >
                    <TableCell>{servico.id}</TableCell>
                    <TableCell>{servico.nome}</TableCell>
                    <TableCell>{servico.descricao}</TableCell>
                    <TableCell>{formatCurrency(servico.valor)}</TableCell>
                    <TableCell>{servico.tempoEstimado}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={(e) => { e.stopPropagation(); handleOpenForm(servico); }}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={(e) => { e.stopPropagation(); handleOpenDelete(servico.id); }}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton onClick={() => handlePrint(servico)} color="secondary">
                        <PrintIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t('nenhumRegistro')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Formulário de Serviço */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? `${t('editar')} ${t('servicos_titulo').slice(0, -1)}` : t('novoServico')}</DialogTitle>
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
            name="descricao"
            label={t('descricao')}
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.descricao}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="valor"
            label={t('valor')}
            type="number"
            fullWidth
            variant="outlined"
            value={formData.valor}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="tempoEstimado"
            label={t('tempoEstimado')}
            type="text"
            fullWidth
            variant="outlined"
            value={formData.tempoEstimado}
            onChange={handleInputChange}
            placeholder="Ex: 2 horas"
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
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
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

export default Servicos;