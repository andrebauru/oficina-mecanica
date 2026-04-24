import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Stack,
  TextField,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArticleIcon from '@mui/icons-material/Article';

interface VendaContrato {
  id: string;
  clienteNome: string;
  fabricante: string;
  modelo: string;
  ano: number;
  placa?: string;
  valorTotal: number;
  created_at?: string;
  contratoPath?: string;
  contratoGeradoEm?: string;
}

type IdiomaContrato = 'pt' | 'ja' | 'fil' | 'vi' | 'id' | 'en';

const IDIOMAS_DISPONIVEIS: Array<{ value: IdiomaContrato; label: string }> = [
  { value: 'pt', label: '🇧🇷 Português' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'fil', label: '🇵🇭 Tagalo' },
  { value: 'vi', label: '🇻🇳 Vietnamita' },
  { value: 'id', label: '🇮🇩 Indonésio' },
  { value: 'en', label: '🇺🇸 English' },
];

const IDIOMAS_PADRAO: IdiomaContrato[] = ['pt', 'ja'];

const formatJPY = (value: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const Contratos = () => {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [pendentes, setPendentes] = useState<VendaContrato[]>([]);
  const [gerados, setGerados] = useState<VendaContrato[]>([]);
  const [tab, setTab] = useState(1);
  const [idiomasSelecionados, setIdiomasSelecionados] = useState<IdiomaContrato[]>(IDIOMAS_PADRAO);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [buscaGerados, setBuscaGerados] = useState('');

  const carregar = async () => {
    try {
      setLoading(true);
      setErro('');
      const [pendentesRes, geradosRes] = await Promise.all([
        axios.get('/api/vendas_carros/pending-delivery'),
        axios.get('/api/vendas_carros/contracts/generated'),
      ]);
      setPendentes(pendentesRes.data || []);
      setGerados(geradosRes.data || []);
    } catch (e) {
      console.error(e);
      setErro('Erro ao carregar módulo de contratos. Verifique sua sessão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const resumo = useMemo(() => ({
    pendentes: pendentes.length,
    gerados: gerados.length,
  }), [pendentes.length, gerados.length]);

  const geradosFiltrados = useMemo(() => {
    const termo = buscaGerados.trim().toLowerCase();
    if (!termo) return gerados;

    return gerados.filter((item) => {
      const cliente = String(item.clienteNome || '').toLowerCase();
      const placa = String(item.placa || '').toLowerCase();
      const dataGerado = item.contratoGeradoEm
        ? new Date(item.contratoGeradoEm).toLocaleDateString('pt-BR').toLowerCase()
        : '';
      const dataCreated = item.created_at
        ? new Date(item.created_at).toLocaleDateString('pt-BR').toLowerCase()
        : '';

      return cliente.includes(termo) || placa.includes(termo) || dataGerado.includes(termo) || dataCreated.includes(termo);
    });
  }, [gerados, buscaGerados]);

  const handleGerarContrato = async (vendaId: string) => {
    const idiomas = idiomasSelecionados.length > 0 ? idiomasSelecionados : IDIOMAS_PADRAO;
    try {
      setProcessandoId(vendaId);
      setErro('');
      await axios.post(`/api/vendas_carros/${vendaId}/contracts/generate`, { idiomas });
      await carregar();
    } catch (e) {
      console.error(e);
      setErro('Falha ao gerar contrato. Verifique os dados da venda e tente novamente.');
    } finally {
      setProcessandoId(null);
    }
  };

  const handleVisualizarContrato = async (vendaId: string) => {
    try {
      const response = await axios.get(`/api/vendas_carros/${vendaId}/contracts/view`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setErro('Arquivo de contrato não encontrado no servidor. Use "Regerar Contrato" para criar novamente.');
      } else {
        setErro('Erro ao visualizar contrato.');
      }
      console.error(e);
    }
  };

  const handleDownloadContrato = async (vendaId: string, nomeCliente: string) => {
    try {
      const response = await axios.get(`/api/vendas_carros/${vendaId}/contracts/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_${nomeCliente.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setErro('Arquivo de contrato não encontrado no servidor. Use "Regerar Contrato" para criar novamente.');
      } else {
        setErro('Erro ao baixar contrato.');
      }
      console.error(e);
    }
  };

  const renderIdiomasSelecionados = (idiomas: IdiomaContrato[]) => {
    const lista = idiomas.length > 0 ? idiomas : IDIOMAS_PADRAO;
    return lista
      .map((idioma) => IDIOMAS_DISPONIVEIS.find((option) => option.value === idioma)?.label || idioma)
      .join(', ');
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <ArticleIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4">Contratos</Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, minWidth: 220, borderLeft: '4px solid', borderColor: 'warning.main' }}>
          <Typography variant="subtitle2" color="text.secondary">Pendentes de contrato</Typography>
          <Typography variant="h4" color="warning.main">{resumo.pendentes}</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 220, borderLeft: '4px solid', borderColor: 'success.main' }}>
          <Typography variant="subtitle2" color="text.secondary">Contratos gerados</Typography>
          <Typography variant="h4" color="success.main">{resumo.gerados}</Typography>
        </Paper>
      </Stack>

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Idiomas do contrato (PDF único)
          </Typography>
          <FormControl size="small" sx={{ minWidth: 360 }}>
            <InputLabel>Idiomas</InputLabel>
            <Select
              multiple
              label="Idiomas"
              value={idiomasSelecionados}
              renderValue={(selected) => renderIdiomasSelecionados(selected as IdiomaContrato[])}
              onChange={(e) => setIdiomasSelecionados(e.target.value as IdiomaContrato[])}
            >
              {IDIOMAS_DISPONIVEIS.map((idioma) => (
                <MenuItem key={idioma.value} value={idioma.value}>{idioma.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.75 }}>
            Padrão profissional: Português + Japonês no mesmo PDF.
          </Typography>

          {tab === 1 && (
            <TextField
              size="small"
              fullWidth
              sx={{ mt: 1.5, maxWidth: 460 }}
              label="Pesquisar (Cliente, Data ou Placa)"
              value={buscaGerados}
              onChange={(e) => setBuscaGerados(e.target.value)}
            />
          )}
        </Box>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label={`Pendentes (${resumo.pendentes})`} />
          <Tab label={`Gerados (${resumo.gerados})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Veículo</strong></TableCell>
                <TableCell align="right"><strong>Valor (JPY)</strong></TableCell>
                <TableCell><strong>Data</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nenhuma venda pendente de contrato.
                  </TableCell>
                </TableRow>
              ) : pendentes.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.clienteNome}</TableCell>
                  <TableCell>
                    {item.fabricante} {item.modelo}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {item.ano}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatJPY(item.valorTotal)}</strong>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.created_at ? new Date(item.created_at).toLocaleString('ja-JP') : '—'}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={processandoId === item.id ? undefined : <ArticleIcon />}
                      onClick={() => handleGerarContrato(item.id)}
                      disabled={processandoId === item.id}
                    >
                      {processandoId === item.id ? (
                        <><CircularProgress size={14} sx={{ mr: 1 }} />Gerando…</>
                      ) : 'Gerar Contrato'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell><strong>Veículo</strong></TableCell>
                <TableCell><strong>Placa</strong></TableCell>
                <TableCell align="right"><strong>Valor (JPY)</strong></TableCell>
                <TableCell><strong>Gerado em</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {geradosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nenhum contrato gerado ainda.
                  </TableCell>
                </TableRow>
              ) : geradosFiltrados.map((item) => {
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.clienteNome}</TableCell>
                    <TableCell>
                      {item.fabricante} {item.modelo}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {item.ano}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.placa || '—'}</TableCell>
                    <TableCell align="right">
                      <strong>{formatJPY(item.valorTotal)}</strong>
                    </TableCell>
                    <TableCell>
                      {item.contratoGeradoEm
                        ? new Date(item.contratoGeradoEm).toLocaleString('ja-JP')
                        : '—'}
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleVisualizarContrato(item.id)}
                        >
                          Ver
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadContrato(item.id, item.clienteNome)}
                        >
                          Download
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={processandoId === item.id ? undefined : <ArticleIcon />}
                          onClick={() => handleGerarContrato(item.id)}
                          disabled={processandoId === item.id}
                        >
                          {processandoId === item.id ? (
                            <><CircularProgress size={14} sx={{ mr: 1 }} />Gerando…</>
                          ) : 'Regerar'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default Contratos;
