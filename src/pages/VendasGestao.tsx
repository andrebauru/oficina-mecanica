import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  SelectChangeEvent,
  Tab,
  Tabs,
  Tooltip
} from '@mui/material';
import {
  MessageCircle,
  FileText,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Download
} from 'lucide-react';
import axios from 'axios';
import ContratoDialog from '../components/ContratoDialog';
import ModalVenda from '../components/ModalVenda';
import {
  Parcela,
  Venda,
  StatusParcela,
  DadosContrato,
  DadosParcelaSingular
} from '../types/vendas';
import {
  calcularResumoRecebivel,
  atualizarStatusParcela,
  formatarMoeda,
  formatarDataBR,
  gerarLinkWhatsApp,
  exportarParcelasCSV
} from '../utils/vendas';

const API_URL = '/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

interface VendaResumo {
  vendaId: string;
  clienteNome: string;
  clienteTelefone: string;
  valorTotal: number;
  proximoVencimento: string;
  statusGeral: StatusParcela;
  descricaoParcelas: string;
  parcelas: Parcela[];
  totalParcelas: number;
  parcelasPagas: number;
}

export const VendasGestao: React.FC = () => {
  
  // Estados
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusParcela | 'todos'>('todos');
  const [tabAtual, setTabAtual] = useState(0);
  const [contratoDialog, setContratoDialog] = useState(false);
  const [dadosContratoAtual, setDadosContratoAtual] = useState<DadosContrato | null>(null);
  const [parcelaParaBaixa, setParcelaParaBaixa] = useState<Parcela | null>(null);
  const [dialogBaixaOpen, setDialogBaixaOpen] = useState(false);
  const [baixandoParcela, setBaixandoParcela] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'cliente' | 'valor' | 'vencimento' | 'status'>('vencimento');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [parcelasRes, vendasRes] = await Promise.all([
        axios.get(`${API_URL}/parcelas`),
        axios.get(`${API_URL}/vendas`)
      ]);

      setParcelas(parcelasRes.data);
      setVendas(vendasRes.data);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setErro(mensagem);
      console.error('Erro ao carregar:', err);
    } finally {
      setCarregando(false);
    }
  };

  // Calcular resumo
  const resumo = useMemo(() => {
    return calcularResumoRecebivel(parcelas);
  }, [parcelas]);

  // Agrupar parcelas por venda
  const vendasAgrupadas = useMemo((): VendaResumo[] => {
    // Agrupar parcelas por vendaId
    const grupos: Record<string, Parcela[]> = {};
    parcelas.forEach(p => {
      if (!grupos[p.vendaId]) grupos[p.vendaId] = [];
      grupos[p.vendaId].push(p);
    });

    const resultado: VendaResumo[] = Object.entries(grupos).map(([vendaId, parcelasVenda]) => {
      parcelasVenda.sort((a, b) => a.numeroParcela - b.numeroParcela);
      const primeiraP = parcelasVenda[0];
      const totalParcelas = parcelasVenda.length;
      const parcelasPagas = parcelasVenda.filter(p => p.status === 'pago').length;
      const restantes = parcelasVenda.filter(p => p.status !== 'pago');

      // Status geral
      let statusGeral: StatusParcela = 'pago';
      if (restantes.length > 0) {
        const temAtrasada = restantes.some(p => atualizarStatusParcela(p) === 'atrasado');
        statusGeral = temAtrasada ? 'atrasado' : 'pendente';
      }

      // Próximo vencimento (primeira não paga)
      const proximoVencimento = restantes.length > 0
        ? restantes.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))[0].dataVencimento
        : parcelasVenda[parcelasVenda.length - 1].dataVencimento;

      // Descrição de parcelas
      let descricaoParcelas = '';
      if (totalParcelas === 1) {
        descricaoParcelas = statusGeral === 'pago' ? '✓ À Vista — Pago' : '◷ À Vista — Pendente';
      } else if (statusGeral === 'pago') {
        descricaoParcelas = `✓ ${totalParcelas}/${totalParcelas} Parcelas — Quitado`;
      } else {
        const pendentes = totalParcelas - parcelasPagas;
        descricaoParcelas = parcelasPagas === 0
          ? `Entrada + ${pendentes - 1} restantes`
          : `${parcelasPagas}/${totalParcelas} pagas + ${pendentes} restantes`;
      }

      return {
        vendaId,
        clienteNome: primeiraP.clienteNome,
        clienteTelefone: primeiraP.clienteTelefone,
        valorTotal: parcelasVenda.reduce((s, p) => s + p.valor, 0),
        proximoVencimento,
        statusGeral,
        descricaoParcelas,
        parcelas: parcelasVenda,
        totalParcelas,
        parcelasPagas
      };
    });

    // Filtros
    let filtrado = resultado;
    if (filtroStatus !== 'todos') {
      filtrado = filtrado.filter(v => v.statusGeral === filtroStatus);
    }
    if (searchTerm) {
      filtrado = filtrado.filter(v =>
        v.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.clienteTelefone.includes(searchTerm) ||
        v.vendaId.includes(searchTerm)
      );
    }

    // Ordenação
    filtrado.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'id') cmp = a.vendaId.localeCompare(b.vendaId);
      else if (sortBy === 'cliente') cmp = a.clienteNome.localeCompare(b.clienteNome);
      else if (sortBy === 'valor') cmp = a.valorTotal - b.valorTotal;
      else if (sortBy === 'vencimento') cmp = a.proximoVencimento.localeCompare(b.proximoVencimento);
      else if (sortBy === 'status') cmp = a.statusGeral.localeCompare(b.statusGeral);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtrado;
  }, [parcelas, filtroStatus, searchTerm, sortBy, sortDir]);

  // Cores por status
  const getCorStatus = (status: StatusParcela) => {
    switch (status) {
      case 'pago':
        return { background: '#d4edda', color: '#155724', label: '✓ Pago' };
      case 'atrasado':
        return { background: '#f8d7da', color: '#721c24', label: '! Atrasado' };
      case 'pendente':
        return { background: '#fff3cd', color: '#856404', label: '◷ Pendente' };
      case 'devolvido':
        return { background: '#e2e3e5', color: '#383d41', label: '↩ Devolvido' };
      default:
        return { background: '#ffffff', color: '#000000', label: '' };
    }
  };

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Abrir diálogo de contrato
  const handleAbrirContrato = (parcela: Parcela) => {
    const venda = vendas.find(v => v.id === parcela.vendaId);
    if (!venda) return;

    const dados: DadosContrato = {
      nomeComprador: parcela.clienteNome,
      chassi: venda.chassi,
      placa: venda.placa,
      valor: venda.valorTotal,
      jurosPercentual: venda.juros,
      parcelas: [], // Será preenchido após buscar
      foroPagamento: venda.foroPagamento,
      dataVenda: venda.dataVenda,
      numeroVenda: venda.id
    };

    // Buscar parcelas da venda
    const parcelasVenda = parcelas
      .filter(p => p.vendaId === venda.id)
      .map(p => ({
        numero: p.numeroParcela,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        status: atualizarStatusParcela(p)
      }));

    dados.parcelas = parcelasVenda;
    setDadosContratoAtual(dados);
    setContratoDialog(true);
  };

  // Salvar contrato
  const handleSalvarContrato = async (nomeArquivo: string) => {
    try {
      // Atualizar venda com nome do contrato
      const venda = vendas.find(v => v.id === dadosContratoAtual?.numeroVenda);
      if (venda) {
        await axios.patch(`${API_URL}/vendas/${venda.id}`, {
          nomeContrato: nomeArquivo
        });
        await carregarDados();
      }
    } catch (err) {
      console.error('Erro ao salvar contrato:', err);
    }
  };

  // Abrir diálogo de baixa
  const handleAbrirBaixa = (parcela: Parcela) => {
    setParcelaParaBaixa(parcela);
    setDialogBaixaOpen(true);
  };

  // Registrar pagamento
  const handleRegistrarPagamento = async () => {
    if (!parcelaParaBaixa) return;

    try {
      setBaixandoParcela(true);
      await axios.patch(`${API_URL}/parcelas/${parcelaParaBaixa.id}`, {
        status: 'pago',
        dataPagamento: new Date().toISOString().split('T')[0]
      });

      setDialogBaixaOpen(false);
      setParcelaParaBaixa(null);
      await carregarDados();
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      setErro('Erro ao registrar pagamento');
    } finally {
      setBaixandoParcela(false);
    }
  };

  // Gerar link WhatsApp
  const handleWhatsApp = (parcela: Parcela) => {
    const dadosParcela: DadosParcelaSingular = {
      id: parcela.id,
      numero: parcela.numeroParcela,
      valor: parcela.valor,
      dataVencimento: parcela.dataVencimento,
      status: atualizarStatusParcela(parcela),
      clienteNome: parcela.clienteNome,
      clienteTelefone: parcela.clienteTelefone,
      vendaId: parcela.vendaId
    };

    const url = gerarLinkWhatsApp(parcela.clienteTelefone, dadosParcela);
    window.open(url, '_blank');
  };

  // Exportar CSV
  const handleExportarCSV = () => {
    const csv = exportarParcelasCSV(parcelas);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parcelas_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          💰 Gestão de Vendas e Recebíveis
        </Typography>
      </Box>

      {/* Alertas */}
      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

      {/* Cards de Resumo */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #ffc107' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DollarSign size={20} style={{ color: '#ffc107' }} />
                <Typography color="textSecondary" variant="caption">
                  A Receber
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatarMoeda(resumo.totalPendente + resumo.totalAtrasado)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {resumo.quantidadePorStatus.pendente + resumo.quantidadePorStatus.atrasado} parcelas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #28a745' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle size={20} style={{ color: '#28a745' }} />
                <Typography color="textSecondary" variant="caption">
                  Pagos
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatarMoeda(resumo.totalPago)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {resumo.quantidadePorStatus.pago} parcelas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #dc3545' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertCircle size={20} style={{ color: '#dc3545' }} />
                <Typography color="textSecondary" variant="caption">
                  Atrasados
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc3545' }}>
                {formatarMoeda(resumo.totalAtrasado)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {resumo.quantidadePorStatus.atrasado} parcelas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #007bff' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp size={20} style={{ color: '#007bff' }} />
                <Typography color="textSecondary" variant="caption">
                  Total
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatarMoeda(resumo.totalPago + resumo.totalPendente + resumo.totalAtrasado)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {resumo.quantidadeParcelas} parcelas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Abas no topo */}
      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs 
          value={tabAtual} 
          onChange={(_, newValue) => setTabAtual(newValue)}
          aria-label="Abas de gestão"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="📊 Recebíveis" id="tab-0" />
          <Tab label="➕ Nova Venda" id="tab-1" />
        </Tabs>
      </Paper>

      {/* Conteúdo em Card separado */}
      <Card sx={{ mb: 3 }}>
        {/* Tab 1: Dashboard */}
        <TabPanel value={tabAtual} index={0}>
          {/* Filtros */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar por cliente, telefone ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 250 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filtroStatus}
                label="Status"
                onChange={(e: SelectChangeEvent) => setFiltroStatus(e.target.value as any)}
              >
                <MenuItem value="todos">Todos os Status</MenuItem>
                <MenuItem value="pendente">Pendentes</MenuItem>
                <MenuItem value="pago">Pagos</MenuItem>
                <MenuItem value="atrasado">Atrasados</MenuItem>
                <MenuItem value="devolvido">Devolvidos</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Download size={18} />}
              onClick={handleExportarCSV}
            >
              Exportar CSV
            </Button>
          </Box>

          {/* Tabela */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ bgcolor: '#1565c0' }}>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                    <TableSortLabel
                      active={sortBy === 'id'}
                      direction={sortBy === 'id' ? sortDir : 'asc'}
                      onClick={() => handleSort('id')}
                      sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                    >
                      ID Venda
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                    <TableSortLabel active={sortBy === 'cliente'} direction={sortBy === 'cliente' ? sortDir : 'asc'} onClick={() => handleSort('cliente')} sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}>
                      Cliente
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>
                    <TableSortLabel active={sortBy === 'valor'} direction={sortBy === 'valor' ? sortDir : 'asc'} onClick={() => handleSort('valor')} sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}>
                      Valor Total
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                    <TableSortLabel active={sortBy === 'vencimento'} direction={sortBy === 'vencimento' ? sortDir : 'asc'} onClick={() => handleSort('vencimento')} sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}>
                      Próx. Vencimento
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                    <TableSortLabel active={sortBy === 'status'} direction={sortBy === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')} sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}>
                      Situação
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendasAgrupadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">Nenhuma venda encontrada</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  vendasAgrupadas.map((venda) => {
                    const cor = getCorStatus(venda.statusGeral);
                    const parcelaPendente = venda.parcelas.find(p => atualizarStatusParcela(p) !== 'pago');
                    const parcelaParaContrato = venda.parcelas[0];

                    return (
                      <TableRow
                        key={venda.vendaId}
                        sx={{
                          '&:hover': { bgcolor: '#f0f4ff' },
                          backgroundColor: venda.statusGeral === 'atrasado' ? '#fff5f5' : venda.statusGeral === 'pago' ? '#f9fff9' : 'inherit'
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', fontFamily: 'monospace', color: '#555' }}>
                          {venda.vendaId}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{venda.clienteNome}</Typography>
                            <Typography variant="caption" color="textSecondary">{venda.clienteTelefone}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#1565c0' }}>
                          {formatarMoeda(venda.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatarDataBR(venda.proximoVencimento)}</Typography>
                          <Typography variant="caption" sx={{ color: '#888' }}>{venda.descricaoParcelas}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={cor.label}
                            size="small"
                            sx={{ backgroundColor: cor.background, color: cor.color, fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {parcelaPendente && (
                              <>
                                <Tooltip title="Enviar mensagem WhatsApp">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    startIcon={<MessageCircle size={14} />}
                                    onClick={() => handleWhatsApp(parcelaPendente)}
                                  >
                                    WhatsApp
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Registrar pagamento da próxima parcela">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircle size={14} />}
                                    onClick={() => handleAbrirBaixa(parcelaPendente)}
                                  >
                                    Pagar
                                  </Button>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="Gerar contrato PDF">
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<FileText size={14} />}
                                onClick={() => handleAbrirContrato(parcelaParaContrato)}
                              >
                                Contrato
                              </Button>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 2: Nova Venda */}
        <TabPanel value={tabAtual} index={1}>
          <ModalVenda 
            open={true}
            onClose={() => setTabAtual(0)}
            onVendaCriada={async () => {
              await carregarDados();
              setTabAtual(0);
            }}
          />
        </TabPanel>
      </Card>

      {/* Diálogo de Contrato */}
      <ContratoDialog
        open={contratoDialog}
        onClose={() => setContratoDialog(false)}
        dados={dadosContratoAtual}
        onSalvar={handleSalvarContrato}
      />

      {/* Diálogo de Baixa */}
      <Dialog open={dialogBaixaOpen} onClose={() => !baixandoParcela && setDialogBaixaOpen(false)}>
        <DialogTitle>Registrar Pagamento</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {parcelaParaBaixa && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Cliente:</strong> {parcelaParaBaixa.clienteNome}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Parcela:</strong> {parcelaParaBaixa.numeroParcela}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Valor:</strong> {formatarMoeda(parcelaParaBaixa.valor)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Vencimento:</strong> {formatarDataBR(parcelaParaBaixa.dataVencimento)}
              </Typography>
              <Alert severity="success">
                O pagamento será registrado com a data de hoje.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogBaixaOpen(false)}
            disabled={baixandoParcela}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarPagamento}
            variant="contained"
            disabled={baixandoParcela}
          >
            {baixandoParcela ? <CircularProgress size={20} /> : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default VendasGestao;
