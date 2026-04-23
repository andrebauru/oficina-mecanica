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
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface VendaEntrega {
  id: string;
  clienteNome: string;
  fabricante: string;
  modelo: string;
  ano: number;
  valorTotal: number;
  contratoPath?: string;
  contratoGeradoEm?: string;
}

const DashboardEntrega = () => {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [pendentes, setPendentes] = useState<VendaEntrega[]>([]);
  const [gerados, setGerados] = useState<VendaEntrega[]>([]);
  const [tab, setTab] = useState(0);
  const [idiomaPorVenda, setIdiomaPorVenda] = useState<Record<string, 'pt' | 'ja'>>({});
  const [processandoId, setProcessandoId] = useState<string | null>(null);

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
      setErro('Erro ao carregar dashboard de entrega.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const totalPendentes = pendentes.length;
  const totalGerados = gerados.length;

  const handleGerarContrato = async (vendaId: string) => {
    const idioma = idiomaPorVenda[vendaId] || 'pt';
    try {
      setProcessandoId(vendaId);
      await axios.post(`/api/vendas_carros/${vendaId}/contracts/generate`, { idioma });
      await carregar();
    } catch (e) {
      console.error(e);
      setErro('Falha ao gerar contrato para a venda selecionada.');
    } finally {
      setProcessandoId(null);
    }
  };

  const resumo = useMemo(() => ({
    pendentes: totalPendentes,
    gerados: totalGerados,
  }), [totalPendentes, totalGerados]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard de Entrega</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" color="text.secondary">Pendentes de contrato</Typography>
          <Typography variant="h5">{resumo.pendentes}</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" color="text.secondary">Contratos gerados</Typography>
          <Typography variant="h5">{resumo.gerados}</Typography>
        </Paper>
      </Stack>

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="Pendentes" />
          <Tab label="Gerados" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Veículo</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Idioma</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendentes.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">Nenhuma pendência de entrega.</TableCell></TableRow>
              ) : pendentes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.clienteNome}</TableCell>
                  <TableCell>{item.fabricante} {item.modelo} ({item.ano})</TableCell>
                  <TableCell>{Number(item.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Idioma</InputLabel>
                      <Select
                        label="Idioma"
                        value={idiomaPorVenda[item.id] || 'pt'}
                        onChange={(e) => setIdiomaPorVenda(prev => ({ ...prev, [item.id]: e.target.value as 'pt' | 'ja' }))}
                      >
                        <MenuItem value="pt">Português</MenuItem>
                        <MenuItem value="ja">Japonês</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      onClick={() => handleGerarContrato(item.id)}
                      disabled={processandoId === item.id}
                    >
                      {processandoId === item.id ? 'Gerando...' : 'Gerar Contrato'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Veículo</TableCell>
                <TableCell>Gerado em</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gerados.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">Nenhum contrato gerado.</TableCell></TableRow>
              ) : gerados.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.clienteNome}</TableCell>
                  <TableCell>{item.fabricante} {item.modelo} ({item.ano})</TableCell>
                  <TableCell>{item.contratoGeradoEm ? new Date(item.contratoGeradoEm).toLocaleString('pt-BR') : '-'}</TableCell>
                  <TableCell align="right">
                    <Button
                      startIcon={<VisibilityIcon />}
                      sx={{ mr: 1 }}
                      onClick={() => window.open(`/api/vendas_carros/${item.id}/contracts/view`, '_blank')}
                    >
                      Visualizar
                    </Button>
                    <Button
                      startIcon={<DownloadIcon />}
                      variant="outlined"
                      onClick={() => window.open(`/api/vendas_carros/${item.id}/contracts/download`, '_blank')}
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default DashboardEntrega;
