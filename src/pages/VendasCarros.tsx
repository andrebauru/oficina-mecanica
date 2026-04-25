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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import ArticleIcon from '@mui/icons-material/Article';
import { useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import HirataLogo from '../assets/Hirata Logo.svg';
import { baixarReciboVendaPDF, gerarReciboVendaImagem, gerarReciboVendaPDF } from '../utils/gerarReciboVendaPDF';
import { sanitizeMultilineText, sanitizeNumber, sanitizeText } from '../utils/security';
import { useLanguage } from '../components/LanguageContext';

interface VendaCarro {
  id: string;
  valor: number;
  valorPago?: number;
  fabricante: string;
  modelo: string;
  ano: number;
  kilometragem: number;
  parcelas: number;
  juros: number;
  valorTotal: number;
  parcelasStatus?: boolean[];
  clienteId?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  veiculoId?: string;
  reciboPDF?: string;
  reciboGeradoEm?: string;
  contratoPath?: string;
  contratoGeradoEm?: string;
}

interface VendaCarroFormData {
  valor: number | '';
  valorPago: number | '';
  fabricante: string;
  modelo: string;
  ano: number | '';
  kilometragem: number | '';
  parcelas: number | '';
  juros: number | '';
  clienteId: string;
  clienteNome: string;
  veiculoId?: string;
}

interface ConfiguracaoEmpresa {
  nomeEmpresa?: string;
  endereco?: string;
  telefone?: string;
  numeroAutorizacao?: string;
}

interface VeiculoCadastro {
  id: string;
  clienteId?: string;
  marca: string;
  modelo: string;
  ano?: number;
  placa?: string;
  kilometragem?: number;
  status?: string;
}

type IdiomaContrato = 'pt' | 'ja' | 'fil' | 'vi' | 'id' | 'en';

const IDIOMAS_CONTRATO_DISPONIVEIS: Array<{ value: IdiomaContrato; label: string }> = [
  { value: 'pt', label: '🇧🇷 Português' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'fil', label: '🇵🇭 Tagalo' },
  { value: 'vi', label: '🇻🇳 Vietnamita' },
  { value: 'id', label: '🇮🇩 Indonésio' },
  { value: 'en', label: '🇺🇸 English' },
];

const IDIOMAS_CONTRATO_PADRAO: IdiomaContrato[] = ['pt', 'ja'];


const vendaCarroVazio: VendaCarroFormData = {
  valor: '',
  valorPago: '',
  fabricante: '',
  modelo: '',
  ano: '',
  kilometragem: '',
  parcelas: 1,
  juros: 0,
  clienteId: '',
  clienteNome: '',
  veiculoId: '',
};

const VendasCarros = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const [vendasCarros, setVendasCarros] = useState<VendaCarro[]>([]);
  const [vendasCarrosFiltradas, setVendasCarrosFiltradas] = useState<VendaCarro[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [formData, setFormData] = useState<VendaCarroFormData>(vendaCarroVazio);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vendaCarroParaDeletar, setVendaCarroParaDeletar] = useState<string | null>(null);
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
  const [clientes, setClientes] = useState<Array<{id: string; nome: string; telefone?: string; endereco?: string}>>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<{id: string; nome: string; telefone?: string; endereco?: string} | null>(null);
  const [veiculosCadastrados, setVeiculosCadastrados] = useState<VeiculoCadastro[]>([]);
  const [veiculosDisponiveis, setVeiculosDisponiveis] = useState<VeiculoCadastro[]>([]);
  const [veiculoSelecionadoId, setVeiculoSelecionadoId] = useState('');
  const [configEmpresa, setConfigEmpresa] = useState<ConfiguracaoEmpresa>({});
  const [idiomasContrato, setIdiomasContrato] = useState<IdiomaContrato[]>(IDIOMAS_CONTRATO_PADRAO);

  // Cálculo automático de valorTotal e valorParcela
  const valorBase = Number(formData.valor) || 0;
  const taxaJuros = Number(formData.juros) || 0;
  const numParcelas = Number(formData.parcelas) || 1;
  const valorTotal = valorBase * (1 + taxaJuros / 100);
  const valorParcela = numParcelas > 0 ? valorTotal / numParcelas : valorTotal;

  const fetchVendasCarros = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vendas_carros');
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

  const recarregarVeiculosDisponiveis = async () => {
    try {
      const [todosRes, disponiveisRes] = await Promise.all([
        axios.get('/api/veiculos').catch(() => ({ data: [] })),
        axios.get('/api/veiculos?status=disponivel').catch(() => ({ data: [] })),
      ]);
      setVeiculosCadastrados(todosRes.data || []);
      setVeiculosDisponiveis(disponiveisRes.data || []);
    } catch {
      // sem bloqueio de fluxo
    }
  };

  useEffect(() => {
    fetchVendasCarros();
    Promise.all([
      axios.get('/api/clientes').catch(() => ({ data: [] })),
      axios.get('/api/configuracoes').catch(() => ({ data: [] })),
      axios.get('/api/veiculos').catch(() => ({ data: [] })),
      axios.get('/api/veiculos?status=disponivel').catch(() => ({ data: [] })),
    ])
      .then(([clientesRes, configRes, veiculosRes, disponiveisRes]) => {
        setClientes(clientesRes.data);
        setConfigEmpresa(configRes.data?.[0] || {});
        setVeiculosCadastrados(veiculosRes.data || []);
        setVeiculosDisponiveis(disponiveisRes.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && highlightId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [loading, highlightId]);

  useEffect(() => {
    if (formData.clienteId) {
      const c = clientes.find(cl => cl.id === formData.clienteId);
      setClienteSelecionado(c || null);
    } else {
      setClienteSelecionado(null);
    }
  }, [formData.clienteId, clientes]);

  const handleOpenForm = (vendaCarro?: VendaCarro) => {
    recarregarVeiculosDisponiveis();

    if (vendaCarro) {
      setFormData({
        valor: vendaCarro.valor,
        valorPago: vendaCarro.valorPago ?? vendaCarro.valor,
        fabricante: vendaCarro.fabricante,
        modelo: vendaCarro.modelo,
        ano: vendaCarro.ano,
        kilometragem: vendaCarro.kilometragem,
        parcelas: vendaCarro.parcelas ?? 1,
        juros: vendaCarro.juros ?? 0,
        clienteId: vendaCarro.clienteId || '',
        clienteNome: vendaCarro.clienteNome || '',
        veiculoId: vendaCarro.veiculoId || '',
      });
      setEditingId(vendaCarro.id);
    } else {
      setFormData(vendaCarroVazio);
      setEditingId(null);
    }
    setClienteSelecionado(null);
    setVeiculoSelecionadoId('');
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setVeiculoSelecionadoId('');
  };

  const handleGerarContrato = async (vendaId: string) => {
    try {
      await axios.post(`/api/vendas_carros/${vendaId}/contracts/generate`, {
        idiomas: idiomasContrato.length > 0 ? idiomasContrato : IDIOMAS_CONTRATO_PADRAO,
      });
      setSnackbar({
        open: true,
        message: 'Contrato gerado com sucesso.',
        severity: 'success',
      });
      fetchVendasCarros();
    } catch (error) {
      console.error('Erro ao gerar contrato da venda de carro:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao gerar contrato da venda.',
        severity: 'error',
      });
    }
  };

  const handleVisualizarContrato = async (vendaId: string) => {
    try {
      const response = await axios.get(`/api/vendas_carros/${vendaId}/contracts/view`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setSnackbar({
          open: true,
          message: 'Arquivo do contrato não foi encontrado. Gere/Regere o contrato novamente.',
          severity: 'warning',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Erro ao visualizar contrato.',
          severity: 'error',
        });
      }
    }
  };

  const handleDownloadContrato = async (venda: VendaCarro) => {
    try {
      const response = await axios.get(`/api/vendas_carros/${venda.id}/contracts/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_${(venda.clienteNome || `${venda.fabricante}_${venda.modelo}`).replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setSnackbar({
          open: true,
          message: 'Arquivo do contrato não foi encontrado. Gere/Regere o contrato novamente.',
          severity: 'warning',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Erro ao baixar contrato.',
          severity: 'error',
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['valor', 'valorPago', 'ano', 'kilometragem', 'parcelas', 'juros'];
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
        valor: sanitizeNumber(Number(formData.valor), { min: 0 }),
        valorPago: sanitizeNumber(Number(formData.valorPago), { min: 0, max: valorTotal }),
        fabricante: sanitizeText(formData.fabricante, 80),
        modelo: sanitizeText(formData.modelo, 80),
        ano: Number(formData.ano),
        kilometragem: Number(formData.kilometragem),
        parcelas: newParcelas,
        juros: Number(formData.juros) || 0,
        valorTotal,
        parcelasStatus,
        clienteId: formData.clienteId || undefined,
        clienteNome: sanitizeText(formData.clienteNome || '', 100) || undefined,
        clienteTelefone: sanitizeText(clienteSelecionado?.telefone || '', 40) || undefined,
        clienteEndereco: sanitizeMultilineText(clienteSelecionado?.endereco || '', 250) || undefined,
        veiculoId: formData.veiculoId || undefined,
      };

      if (editingId) {
        await axios.put(`/api/vendas_carros/${editingId}`, dataToSubmit);
        setSnackbar({
          open: true,
          message: 'Venda de carro atualizada com sucesso',
          severity: 'success'
        });
      } else {
        const response = await axios.post('/api/vendas_carros', dataToSubmit);
        const vendaCriada = response.data;

        try {
          const tipoVenda = (newParcelas > 1 ? 'parcelado' : 'vista') as 'parcelado' | 'vista';
          const reciboDados = {
            logoUrl: HirataLogo,
            nomeEmpresa: configEmpresa.nomeEmpresa,
            enderecoEmpresa: configEmpresa.endereco,
            telefoneEmpresa: configEmpresa.telefone,
            numeroAutorizacao: configEmpresa.numeroAutorizacao,
            clienteNome: clienteSelecionado?.nome || formData.clienteNome || 'Cliente',
            clienteTelefone: clienteSelecionado?.telefone,
            clienteEndereco: clienteSelecionado?.endereco,
            numeroVenda: String(vendaCriada.id),
            dataVenda: new Date().toISOString(),
            descricaoVeiculo: `${formData.fabricante} ${formData.modelo} (${formData.ano})`,
            tipoVenda,
            valorTotal,
            valorPago: sanitizeNumber(Number(formData.valorPago), { min: 0, max: valorTotal }),
            observacoes: `Quilometragem: ${formData.kilometragem} km`,
          };

          const reciboBlob = await gerarReciboVendaPDF(reciboDados);
          const reciboImagem = await gerarReciboVendaImagem(reciboDados);

          const reciboPDF = baixarReciboVendaPDF(reciboBlob, String(vendaCriada.id), clienteSelecionado?.nome || formData.clienteNome || 'cliente');
          await axios.patch(`/api/vendas_carros/${vendaCriada.id}`, {
            reciboPDF,
            reciboGeradoEm: new Date().toISOString(),
          }).catch(() => {});

          if (clienteSelecionado?.id) {
            await axios.post('/api/documentos', {
              entityId: clienteSelecionado.id,
              entityType: 'cliente',
              base64: reciboImagem,
              filename: reciboPDF.replace('.pdf', '.jpg'),
              anotacao: `Recibo da venda de carro ${vendaCriada.id} • Valor pago: ${formatCurrency(sanitizeNumber(Number(formData.valorPago), { min: 0, max: valorTotal }))}`,
              dataUpload: new Date().toISOString(),
              categoria: 'recibo_venda_carro',
              referenciaId: String(vendaCriada.id),
              referenciaTipo: 'venda_carro',
              arquivoOriginal: reciboPDF,
            }).catch(() => {});
          }
        } catch (pdfError) {
          console.error('Erro ao gerar recibo da venda de carro:', pdfError);
        }

        try {
          const contractResponse = await axios.post(`/api/vendas_carros/${vendaCriada.id}/contracts/generate`, {
            idiomas: idiomasContrato.length > 0 ? idiomasContrato : IDIOMAS_CONTRATO_PADRAO,
          });

          if (contractResponse.data?.downloadUrl) {
            const downloadBlob = await axios.get(contractResponse.data.downloadUrl, {
              responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([downloadBlob.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `contrato_${(clienteSelecionado?.nome || formData.clienteNome || 'cliente').replace(/\s+/g, '_')}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
          }
        } catch (contractError) {
          console.error('Erro ao gerar contrato da venda de carro:', contractError);
        }

        setSnackbar({
          open: true,
          message: 'Venda de carro adicionada com sucesso. Recibo e contrato processados.',
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

  const handleOpenDelete = (id: string) => {
    setVendaCarroParaDeletar(id);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
  };

  const handleDelete = async () => {
    if (vendaCarroParaDeletar) {
      try {
        await axios.delete(`/api/vendas_carros/${vendaCarroParaDeletar}`);
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
      await axios.patch(`/api/vendas_carros/${venda.id}`, { parcelasStatus: updated });
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

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Idiomas para gerar/regerar contrato
        </Typography>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 380 } }}>
          <InputLabel>Idiomas do Contrato</InputLabel>
          <Select
            multiple
            value={idiomasContrato}
            label="Idiomas do Contrato"
            renderValue={(selected) => (selected as IdiomaContrato[])
              .map((idioma) => IDIOMAS_CONTRATO_DISPONIVEIS.find((item) => item.value === idioma)?.label || idioma)
              .join(', ')}
            onChange={(e) => setIdiomasContrato(e.target.value as IdiomaContrato[])}
          >
            {IDIOMAS_CONTRATO_DISPONIVEIS.map((idioma) => (
              <MenuItem key={idioma.value} value={idioma.value}>{idioma.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
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
                          color="warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGerarContrato(vendaCarro.id);
                          }}
                          size="small"
                          title={vendaCarro.contratoPath ? 'Regerar contrato' : 'Gerar contrato'}
                        >
                          <ArticleIcon />
                        </IconButton>
                        {vendaCarro.contratoPath && (
                          <>
                            <IconButton
                              color="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVisualizarContrato(vendaCarro.id);
                              }}
                              size="small"
                              title="Visualizar contrato"
                            >
                              <DescriptionIcon />
                            </IconButton>
                            <IconButton
                              color="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadContrato(vendaCarro);
                              }}
                              size="small"
                              title="Baixar contrato"
                            >
                              <DownloadIcon />
                            </IconButton>
                          </>
                        )}
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
                  <TableCell colSpan={7} align="center">
                    {t('nenhumaVenda')}
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
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Veículo do Estoque</InputLabel>
                <Select
                  value={veiculoSelecionadoId}
                  label="Veículo do Estoque"
                  onChange={(e) => {
                    const veiculoId = e.target.value;
                    setVeiculoSelecionadoId(veiculoId);

                    // Buscar em todos os cadastrados (edição pode ter veículo já vendido)
                    const veiculo = veiculosCadastrados.find((item) => item.id === veiculoId)
                      || veiculosDisponiveis.find((item) => item.id === veiculoId);

                    if (!veiculo) {
                      setFormData((prev) => ({ ...prev, veiculoId: '' }));
                      return;
                    }

                    const clienteByVeiculo = veiculo.clienteId
                      ? clientes.find((c) => c.id === veiculo.clienteId)
                      : undefined;

                    setFormData((prev) => ({
                      ...prev,
                      veiculoId,
                      clienteId: veiculo.clienteId || prev.clienteId,
                      clienteNome: clienteByVeiculo?.nome || prev.clienteNome,
                      fabricante: veiculo.marca || prev.fabricante,
                      modelo: veiculo.modelo || prev.modelo,
                      ano: veiculo.ano ?? prev.ano,
                      kilometragem: veiculo.kilometragem ?? prev.kilometragem,
                    }));
                  }}
                >
                  <MenuItem value=""><em>Selecionar veículo do estoque...</em></MenuItem>
                  {veiculosDisponiveis.map((veiculo) => (
                    <MenuItem key={veiculo.id} value={veiculo.id}>
                      {veiculo.marca} {veiculo.modelo}
                      {veiculo.ano ? ` (${veiculo.ano})` : ''}
                      {veiculo.placa ? ` — ${veiculo.placa}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {veiculoSelecionadoId && formData.fabricante && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  🚗 {formData.fabricante} {formData.modelo}
                  {formData.ano ? ` • ${formData.ano}` : ''}
                  {formData.kilometragem ? ` • ${Number(formData.kilometragem).toLocaleString('pt-BR')} km` : ''}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Cliente (Comprador)</InputLabel>
                <Select
                  value={formData.clienteId}
                  label="Cliente (Comprador)"
                  onChange={e => {
                    const clienteId = e.target.value;
                    const cliente = clientes.find(c => c.id === clienteId);
                    setFormData(prev => ({
                      ...prev,
                      clienteId,
                      clienteNome: cliente?.nome || ''
                    }));
                  }}
                >
                  <MenuItem value=""><em>Nenhum</em></MenuItem>
                  {clientes.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {clienteSelecionado && (
              <Grid item xs={12}>
                <Paper sx={{ p: 1.5, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                  <Typography variant="caption" color="text.secondary">Dados do Cliente</Typography>
                  <Typography variant="body2" fontWeight={500}>{clienteSelecionado.nome}</Typography>
                  {clienteSelecionado.telefone && <Typography variant="caption">{clienteSelecionado.telefone}</Typography>}
                </Paper>
              </Grid>
            )}
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
                name="valorPago"
                label="Valor Pago"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.valorPago}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
                helperText="Esse valor será impresso no recibo PDF da venda."
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Idiomas do Contrato</InputLabel>
                <Select
                  multiple
                  value={idiomasContrato}
                  label="Idiomas do Contrato"
                  renderValue={(selected) => (selected as IdiomaContrato[])
                    .map((idioma) => IDIOMAS_CONTRATO_DISPONIVEIS.find((item) => item.value === idioma)?.label || idioma)
                    .join(', ')}
                  onChange={(e) => setIdiomasContrato(e.target.value as IdiomaContrato[])}
                >
                  {IDIOMAS_CONTRATO_DISPONIVEIS.map((idioma) => (
                    <MenuItem key={idioma.value} value={idioma.value}>{idioma.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Padrão automático: Português + Japonês no mesmo PDF.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Resumo financeiro</Typography>
                <Typography variant="body1">Valor Total: <strong>{formatCurrency(valorTotal)}</strong></Typography>
                <Typography variant="body1">Valor Pago: <strong>{formatCurrency(Number(formData.valorPago) || 0)}</strong></Typography>
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
            {t('temCertezaExcluirOS')}
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
