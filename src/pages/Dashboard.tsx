import {
  Box, Grid, Typography, Card, CardContent, CardHeader,
  List, ListItemButton, ListItemText, Divider, Chip, Button, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, TextField, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArticleIcon from '@mui/icons-material/Article';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/formatters';
import { useLanguage } from '../components/LanguageContext';

interface Cliente {
  id: string;
  nome: string;
}

interface Veiculo {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
}

interface OrdemServico {
  id: string;
  veiculoId: string;
  dataEntrada: string;
  status: string;
  valorTotal: number;
  parcelas?: number;
  parcelasStatus?: boolean[];
}

interface VendaCarro {
  id: number;
  valor: number;
  fabricante: string;
  modelo: string;
  ano: number;
  kilometragem: number;
  parcelas?: number;
  valorTotal?: number;
  valorPago?: number;
  status?: string;
  parcelasStatus?: boolean[];
}

interface FinanceiroDashboard {
  totalRecebido: number;
  totalPendente: number;
  proximasContas: Array<{
    id: string;
    clienteNome: string;
    dataVencimento: string;
    valor: number;
    status: string;
  }>;
}

// Representa uma parcela retornada pelo endpoint de calendário
interface ParcelaCalendario {
  id: string;
  clienteNome: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string;
  status: string;
  // 'parcelas' = venda de gestão | 'vendas_parcelas' = contrato de cliente
  origem: 'parcelas' | 'vendas_parcelas';
}

// Mapa dia→lista de parcelas retornado pela API
type VencimentosPorDia = Record<number, ParcelaCalendario[]>;

// Nomes dos dias da semana abreviados nos 4 idiomas
const DIAS_SEMANA: Record<string, string[]> = {
  pt:  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  fil: ['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'],
  vi:  ['CN',  'T2',  'T3',  'T4',  'T5',  'T6',  'T7'],
  ja:  ['日',  '月',  '火',  '水',  '木',  '金',  '土'],
};

// Nomes dos meses nos 4 idiomas
const MESES: Record<string, string[]> = {
  pt:  ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  fil: ['Enero','Pebrero','Marso','Abril','Mayo','Hunyo','Hulyo','Agosto','Setyembre','Oktubre','Nobyembre','Disyembre'],
  vi:  ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  ja:  ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
};

const Dashboard = () => {
  const { t, language } = useLanguage();

  // ─── Estado: dados gerais do dashboard ───────────────────────────────────────
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [vendasCarros, setVendasCarros] = useState<VendaCarro[]>([]);
  const [financeiroDashboard, setFinanceiroDashboard] = useState<FinanceiroDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Estado: dialog de contrato em branco ────────────────────────────────────
  const [blankType, setBlankType] = useState<'sale' | 'rental' | null>(null);
  const [langSelectOpen, setLangSelectOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>('pt');

  // ─── Estado: calendário de vencimentos ───────────────────────────────────────
  const hoje = new Date();
  const [calAno, setCalAno] = useState(hoje.getFullYear());
  const [calMes, setCalMes] = useState(hoje.getMonth() + 1); // 1-indexed
  const [vencimentosPorDia, setVencimentosPorDia] = useState<VencimentosPorDia>({});
  const [carregandoCal, setCarregandoCal] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [dialogDiaAberto, setDialogDiaAberto] = useState(false);
  // Controle da remarcação
  const [parcelaSendoRemarcada, setParcelaSendoRemarcada] = useState<ParcelaCalendario | null>(null);
  const [dialogRemarcarAberto, setDialogRemarcarAberto] = useState(false);
  const [novaDataRemarcar, setNovaDataRemarcar] = useState('');
  const [salvandoAcao, setSalvandoAcao] = useState(false);

  // ─── Snackbar de feedback ─────────────────────────────────────────────────────
  const [snack, setSnack] = useState<{ open: boolean; msg: string; tipo: 'success' | 'error' }>({
    open: false, msg: '', tipo: 'success',
  });
  const mostrarSnack = (msg: string, tipo: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, tipo });

  // ─── Carregar dados gerais ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesRes, veiculosRes, ordensRes, vendasRes, financeiroRes] = await Promise.all([
          axios.get('/api/clientes'),
          axios.get('/api/veiculos'),
          axios.get('/api/ordens_servico'),
          axios.get('/api/vendas_carros'),
          axios.get('/api/financeiro/dashboard/mes').catch(() => ({ data: null })),
        ]);

        setClientes(clientesRes.data);
        setVeiculos(veiculosRes.data);
        setOrdensServico(ordensRes.data);
        setVendasCarros(vendasRes.data);
        if (financeiroRes.data) setFinanceiroDashboard(financeiroRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ─── Carregar vencimentos do calendário sempre que o mês/ano mudar ───────────
  useEffect(() => {
    const buscarVencimentosMes = async () => {
      setCarregandoCal(true);
      try {
        const res = await axios.get('/api/calendario/vencimentos', {
          params: { ano: calAno, mes: calMes },
        });
        setVencimentosPorDia(res.data.vencimentos || {});
      } catch {
        // tabelas podem não existir em todos os ambientes — falha silenciosa
        setVencimentosPorDia({});
      } finally {
        setCarregandoCal(false);
      }
    };
    buscarVencimentosMes();
  }, [calAno, calMes]);

  // ─── Navegar entre meses no calendário ───────────────────────────────────────
  const irMesAnterior = () => {
    if (calMes === 1) { setCalMes(12); setCalAno((a) => a - 1); }
    else setCalMes((m) => m - 1);
  };
  const irMesSeguinte = () => {
    if (calMes === 12) { setCalMes(1); setCalAno((a) => a + 1); }
    else setCalMes((m) => m + 1);
  };

  // ─── Handlers dos contratos em branco ────────────────────────────────────────
  const handleOpenLangSelect = (type: 'sale' | 'rental') => {
    setBlankType(type);
    setSelectedLang('pt');
    setLangSelectOpen(true);
  };
  const handlePrintBlank = () => {
    if (!blankType) return;
    window.open(`/api/contracts/blank?type=${blankType}&blank=true&lang=${selectedLang}`, '_blank', 'noopener,noreferrer');
    setLangSelectOpen(false);
  };

  // ─── Clicar num dia do calendário ────────────────────────────────────────────
  const handleClicarDia = (dia: number) => {
    if (!vencimentosPorDia[dia]?.length) return; // dias sem vencimento não abrem
    setDiaSelecionado(dia);
    setDialogDiaAberto(true);
  };

  // ─── Dar baixa numa parcela (marca como paga) ─────────────────────────────────
  const handleDarBaixa = async (parcela: ParcelaCalendario) => {
    setSalvandoAcao(true);
    try {
      await axios.put(`/api/calendario/parcelas/${parcela.id}/baixa`, null, {
        params: { origem: parcela.origem },
      });
      // Atualiza o status localmente sem recarregar o mês todo
      setVencimentosPorDia((prev) => {
        const copia = { ...prev };
        const dia = new Date(parcela.dataVencimento).getDate();
        if (copia[dia]) {
          copia[dia] = copia[dia].map((p) =>
            p.id === parcela.id ? { ...p, status: 'pago' } : p
          );
        }
        return copia;
      });
      mostrarSnack(t('baixaConfirmada'));
    } catch {
      mostrarSnack(t('erroDarBaixa'), 'error');
    } finally {
      setSalvandoAcao(false);
    }
  };

  // ─── Abrir dialog de remarcação ────────────────────────────────────────────────
  const handleAbrirRemarcar = (parcela: ParcelaCalendario) => {
    setParcelaSendoRemarcada(parcela);
    // Preenche o campo com a data atual da parcela como sugestão
    const dataAtual = parcela.dataVencimento
      ? new Date(parcela.dataVencimento).toISOString().split('T')[0]
      : '';
    setNovaDataRemarcar(dataAtual);
    setDialogRemarcarAberto(true);
  };

  // ─── Confirmar remarcação da data de vencimento ────────────────────────────────
  const handleConfirmarRemarcar = async () => {
    if (!parcelaSendoRemarcada || !novaDataRemarcar) return;
    setSalvandoAcao(true);
    try {
      await axios.put(
        `/api/calendario/parcelas/${parcelaSendoRemarcada.id}/remarcar`,
        { novaData: novaDataRemarcar },
        { params: { origem: parcelaSendoRemarcada.origem } }
      );
      // Remove o item do dia original e adiciona ao novo dia
      const diaOriginal = new Date(parcelaSendoRemarcada.dataVencimento).getDate();
      const novoDia = new Date(novaDataRemarcar + 'T12:00:00').getDate();
      const novoMes = new Date(novaDataRemarcar + 'T12:00:00').getMonth() + 1;

      setVencimentosPorDia((prev) => {
        const copia = { ...prev };
        // Remove do dia original
        if (copia[diaOriginal]) {
          copia[diaOriginal] = copia[diaOriginal].filter((p) => p.id !== parcelaSendoRemarcada.id);
          if (!copia[diaOriginal].length) delete copia[diaOriginal];
        }
        // Adiciona no novo dia se for o mesmo mês
        if (novoMes === calMes) {
          if (!copia[novoDia]) copia[novoDia] = [];
          copia[novoDia] = [
            ...copia[novoDia],
            { ...parcelaSendoRemarcada, dataVencimento: novaDataRemarcar },
          ];
        }
        return copia;
      });

      mostrarSnack(t('vencimentoAtualizado'));
      setDialogRemarcarAberto(false);
      setParcelaSendoRemarcada(null);
    } catch {
      mostrarSnack(t('erroAtualizarVencimento'), 'error');
    } finally {
      setSalvandoAcao(false);
    }
  };

  // ─── Cálculo das estatísticas ─────────────────────────────────────────────────
  const totalClientes = clientes.length;
  const totalVeiculos = veiculos.length;
  const ordensEmAndamento = ordensServico.filter(ordem => ordem.status === 'Em andamento').length;
  const faturamentoTotal = ordensServico.reduce((acc, ordem) => acc + ordem.valorTotal, 0);

  let aReceberOS = 0; let jaRecebidoOS = 0;
  ordensServico.forEach(ordem => {
    if (ordem.parcelasStatus && ordem.parcelasStatus.length > 0) {
      const parcCount = ordem.parcelas ?? 1;
      const valorParcela = (ordem.valorTotal || 0) / parcCount;
      ordem.parcelasStatus.forEach(pago => {
        if (pago) jaRecebidoOS += valorParcela; else aReceberOS += valorParcela;
      });
    } else {
      if (['Concluído', 'Entregue'].includes(ordem.status)) jaRecebidoOS += ordem.valorTotal || 0;
      else aReceberOS += ordem.valorTotal || 0;
    }
  });

  let aReceberVC = 0; let jaRecebidoVC = 0;
  vendasCarros.forEach(venda => {
    if (venda.status === 'cancelado') return;

    const valorSinal = Number(venda.valorPago || 0);
    const valorTotal = Number(venda.valorTotal || venda.valor || 0);
    const valorFinanciado = Math.max(0, valorTotal - valorSinal);

    // Regime de Caixa: Entrada/Sinal sempre entra como já recebido
    jaRecebidoVC += valorSinal;

    const parcCount = Number(venda.parcelas || 1);
    if (parcCount > 1 && venda.parcelasStatus && venda.parcelasStatus.length > 0) {
      const valorParcela = valorFinanciado > 0 ? valorFinanciado / parcCount : 0;
      venda.parcelasStatus.forEach(pago => {
        if (pago) jaRecebidoVC += valorParcela;
        else aReceberVC += valorParcela;
      });
    } else if (parcCount > 1) {
      // Parcelas futuras pendentes entram em A Receber
      aReceberVC += valorFinanciado;
    } else {
      // À vista: saldo restante se não quitado integralmente no sinal
      const saldo = Math.max(0, valorTotal - valorSinal);
      if (saldo > 0) {
        aReceberVC += saldo;
      }
    }
  });

  const totalAReceber = aReceberOS + aReceberVC;
  const totalJaRecebido = jaRecebidoOS + jaRecebidoVC;

  const ordensRecentes = [...ordensServico]
    .sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime())
    .slice(0, 5);

  const ultimasVendas = [...vendasCarros]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (loading) {
    return <Typography>{t('carregar')}</Typography>;
  }

  const getVeiculoInfo = (veiculoId: string) => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    if (!veiculo) return t('veiculoNaoEncontrado');
    return `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
  };

  const statCards = [
    { label: t('totalClientes'), value: totalClientes, icon: <PeopleIcon color="primary" sx={{ fontSize: 38 }} />, color: undefined },
    { label: t('totalVeiculos'), value: totalVeiculos, icon: <DirectionsCarIcon color="primary" sx={{ fontSize: 38 }} />, color: undefined },
    { label: t('ordensEmAndamento'), value: ordensEmAndamento, icon: <BuildIcon color="warning" sx={{ fontSize: 38 }} />, color: undefined },
    { label: `${t('faturamentoTotal')} (OS)`, value: formatCurrency(faturamentoTotal), icon: <AttachMoneyIcon color="success" sx={{ fontSize: 38 }} />, color: undefined },
    { label: t('aReceber'), value: formatCurrency(totalAReceber), icon: <AttachMoneyIcon sx={{ fontSize: 38, color: '#d32f2f' }} />, color: '#ffebee' },
    { label: t('jaRecebido'), value: formatCurrency(totalJaRecebido), icon: <AttachMoneyIcon sx={{ fontSize: 38, color: '#2e7d32' }} />, color: '#e8f5e9' },
  ];

  // ─── Lógica para montar a grade do calendário ─────────────────────────────────
  const diasNoMes = new Date(calAno, calMes, 0).getDate();
  // 0=dom ... 6=sab
  const diaDaSemanaInicio = new Date(calAno, calMes - 1, 1).getDay();
  const diasSemana = DIAS_SEMANA[language] || DIAS_SEMANA.pt;
  const nomeMes = (MESES[language] || MESES.pt)[calMes - 1];

  // Parcelas do dia selecionado
  const parcelasDoDiaSelecionado = diaSelecionado ? (vencimentosPorDia[diaSelecionado] || []) : [];

  return (
    <Box sx={{ flexGrow: 1, mt: 4 }}>
      {/* ─── Cards de Contratos em Branco ─────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card
            elevation={3}
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
              borderLeft: '4px solid #1976d2',
            }}
            onClick={() => handleOpenLangSelect('sale')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <ArticleIcon color="primary" sx={{ fontSize: 42 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Contrato de Venda (Em Branco)</Typography>
                <Typography variant="body2" color="text.secondary">Imprimir modelo de contrato de venda de veículo</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card
            elevation={3}
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
              borderLeft: '4px solid #ed6c02',
            }}
            onClick={() => handleOpenLangSelect('rental')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <ArticleIcon color="warning" sx={{ fontSize: 42 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Contrato de Locação (Em Branco)</Typography>
                <Typography variant="body2" color="text.secondary">Imprimir modelo de contrato de locação de veículo</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Dialog seleção de idioma dos contratos ───────────────────────────── */}
      <Dialog open={langSelectOpen} onClose={() => setLangSelectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Selecione o Idioma do Contrato</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escolha o idioma secundário que acompanhará o Japonês (idioma primário) no contrato bilíngue.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="select-lang-label">Idioma Secundário</InputLabel>
            <Select
              labelId="select-lang-label"
              value={selectedLang}
              label="Idioma Secundário"
              onChange={(e) => setSelectedLang(e.target.value as string)}
            >
              <MenuItem value="pt">🇧🇷 Português (pt-BR)</MenuItem>
              <MenuItem value="en">🇬🇧 English (en-US)</MenuItem>
              <MenuItem value="fil">🇵🇭 Filipino (fil-PH)</MenuItem>
              <MenuItem value="vi">🇻🇳 Tiếng Việt (vi-VN)</MenuItem>
              <MenuItem value="id">🇮🇩 Bahasa Indonesia (id-ID)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLangSelectOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handlePrintBlank} variant="contained" color="primary">Imprimir</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Calendário de Vencimentos ───────────────────────────────────────── */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardHeader
          avatar={<CalendarMonthIcon color="primary" />}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight="bold">{t('calendarioVencimentos')}</Typography>
              {carregandoCal && <CircularProgress size={18} sx={{ ml: 1 }} />}
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
              <IconButton onClick={irMesAnterior} size="small" id="cal-btn-mes-anterior">
                <ChevronLeftIcon />
              </IconButton>
              <Typography fontWeight="bold" sx={{ minWidth: 140, textAlign: 'center' }}>
                {nomeMes} {calAno}
              </Typography>
              <IconButton onClick={irMesSeguinte} size="small" id="cal-btn-mes-seguinte">
                <ChevronRightIcon />
              </IconButton>
            </Box>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {/* Cabeçalho dos dias da semana */}
          <Grid container>
            {diasSemana.map((d) => (
              <Grid item key={d} xs={12 / 7} sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                  {d}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mb: 0.5 }} />

          {/* Grade dos dias */}
          <Grid container>
            {/* Células vazias antes do dia 1 */}
            {Array.from({ length: diaDaSemanaInicio }).map((_, i) => (
              <Grid item key={`vazio-${i}`} xs={12 / 7} sx={{ minHeight: 52 }} />
            ))}

            {/* Células dos dias do mês */}
            {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((dia) => {
              const itens = vencimentosPorDia[dia] || [];
              const temPendentes = itens.some((p) => p.status !== 'pago');
              const todosPageos = itens.length > 0 && itens.every((p) => p.status === 'pago');
              const isHoje =
                dia === hoje.getDate() &&
                calMes === hoje.getMonth() + 1 &&
                calAno === hoje.getFullYear();

              return (
                <Grid item key={dia} xs={12 / 7}>
                  <Box
                    id={`cal-dia-${dia}`}
                    onClick={() => handleClicarDia(dia)}
                    sx={{
                      minHeight: 52,
                      border: '1px solid',
                      borderColor: isHoje ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      m: 0.25,
                      p: 0.5,
                      cursor: itens.length ? 'pointer' : 'default',
                      bgcolor: isHoje ? 'primary.50' : 'transparent',
                      transition: 'background 0.15s',
                      '&:hover': itens.length
                        ? { bgcolor: 'action.hover' }
                        : {},
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={isHoje ? 'bold' : 'normal'}
                      color={isHoje ? 'primary' : 'text.primary'}
                    >
                      {dia}
                    </Typography>
                    {/* Badge colorido: laranja=pendente, verde=todos pagos */}
                    {itens.length > 0 && (
                      <Chip
                        label={itens.length}
                        size="small"
                        color={todosPageos ? 'success' : temPendentes ? 'warning' : 'default'}
                        sx={{ height: 18, fontSize: 10, mt: 0.25, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {/* Legenda rápida */}
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, justifyContent: 'flex-end' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label="2" size="small" color="warning" sx={{ height: 16, fontSize: 10 }} />
              <Typography variant="caption" color="text.secondary">Pendente</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label="1" size="small" color="success" sx={{ height: 16, fontSize: 10 }} />
              <Typography variant="caption" color="text.secondary">Pago</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ─── Dialog: Parcelas do Dia ──────────────────────────────────────────── */}
      <Dialog
        open={dialogDiaAberto}
        onClose={() => setDialogDiaAberto(false)}
        maxWidth="md"
        fullWidth
        id="dialog-parcelas-do-dia"
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {t('parcelasDoDia')} — {diaSelecionado}/{calMes}/{calAno}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {parcelasDoDiaSelecionado.length === 0 ? (
            <Typography sx={{ p: 3 }}>{t('semVencimentos')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('cliente')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">{t('numeroParcela')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">{t('valor')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">{t('status')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">{t('origem')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parcelasDoDiaSelecionado.map((parcela) => (
                  <TableRow key={parcela.id} hover>
                    <TableCell>{parcela.clienteNome}</TableCell>
                    <TableCell align="center">{parcela.numeroParcela}</TableCell>
                    <TableCell align="right">{formatCurrency(parcela.valor)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={parcela.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                        size="small"
                        color={parcela.status === 'pago' ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={parcela.origem === 'vendas_parcelas' ? 'Contrato' : 'Gestão'}
                        size="small"
                        variant="filled"
                        color={parcela.origem === 'vendas_parcelas' ? 'secondary' : 'primary'}
                        sx={{ opacity: 0.8 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={t('darBaixa')}>
                          <span>
                            <IconButton
                              id={`btn-baixa-${parcela.id}`}
                              size="small"
                              color="success"
                              disabled={parcela.status === 'pago' || salvandoAcao}
                              onClick={() => handleDarBaixa(parcela)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('remarcarVencimento')}>
                          <IconButton
                            id={`btn-remarcar-${parcela.id}`}
                            size="small"
                            color="primary"
                            disabled={salvandoAcao}
                            onClick={() => handleAbrirRemarcar(parcela)}
                          >
                            <EditCalendarIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogDiaAberto(false)} color="inherit">
            {t('fechar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Remarcar Vencimento ─────────────────────────────────────── */}
      <Dialog
        open={dialogRemarcarAberto}
        onClose={() => setDialogRemarcarAberto(false)}
        maxWidth="xs"
        fullWidth
        id="dialog-remarcar-vencimento"
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('remarcarVencimento')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {parcelaSendoRemarcada?.clienteNome} — {t('numeroParcela')} {parcelaSendoRemarcada?.numeroParcela}
          </Typography>
          <TextField
            id="input-nova-data-vencimento"
            fullWidth
            label={t('novaDataVencimento')}
            type="date"
            value={novaDataRemarcar}
            onChange={(e) => setNovaDataRemarcar(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogRemarcarAberto(false)} color="inherit">
            {t('cancelar')}
          </Button>
          <Button
            onClick={handleConfirmarRemarcar}
            variant="contained"
            disabled={!novaDataRemarcar || salvandoAcao}
            startIcon={salvandoAcao ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {t('salvar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Cards Financeiros do Mês Atual ───────────────────────────────────── */}
      {financeiroDashboard && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={3} sx={{ backgroundColor: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AttachMoneyIcon sx={{ fontSize: 38, color: '#2e7d32' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">🟢 Recebido este Mês</Typography>
                  <Typography variant="h5" fontWeight="bold" color="#2e7d32">
                    {formatCurrency(financeiroDashboard.totalRecebido)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={3} sx={{ backgroundColor: '#fff3e0', borderLeft: '4px solid #e65100' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AttachMoneyIcon sx={{ fontSize: 38, color: '#e65100' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">🟠 A Receber este Mês</Typography>
                  <Typography variant="h5" fontWeight="bold" color="#e65100">
                    {formatCurrency(financeiroDashboard.totalPendente)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {financeiroDashboard.proximasContas.length > 0 && (
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardHeader
                  title="📅 Próximas a Receber"
                  avatar={<CalendarMonthIcon color="primary" />}
                  titleTypographyProps={{ variant: 'subtitle1' }}
                />
                <CardContent sx={{ p: 0 }}>
                  <List disablePadding dense>
                    {financeiroDashboard.proximasContas.map((conta) => (
                      <div key={conta.id}>
                        <ListItemButton sx={{ px: 2, py: 0.5 }}>
                          <ListItemText
                            primary={conta.clienteNome || '—'}
                            secondary={new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}
                          />
                          <Chip
                            label={formatCurrency(conta.valor)}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        </ListItemButton>
                        <Divider />
                      </div>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* ─── Cards de Estatísticas ────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.label}>
            <Card elevation={3} sx={{ backgroundColor: card.color }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {card.icon}
                <Box>
                  <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                  <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Últimas OS e Vendas ──────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader title={t('ultimasOrdens')} />
            <CardContent sx={{ p: 0 }}>
              {ordensRecentes.length > 0 ? (
                <List disablePadding>
                  {ordensRecentes.map((ordem: OrdemServico) => (
                    <div key={ordem.id}>
                      <ListItemButton component={Link} to={`/ordens?highlight=${ordem.id}`} sx={{ px: 2, py: 1 }}>
                        <ListItemText
                          primary={`Veículo: ${getVeiculoInfo(ordem.veiculoId)}`}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                {t('status')}: {ordem.status}
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2">
                                {t('data')}: {new Date(ordem.dataEntrada).toLocaleDateString('pt-BR')}
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2">
                                {t('valor')}: {formatCurrency(ordem.valorTotal)}
                              </Typography>
                            </>
                          }
                        />
                      </ListItemButton>
                      <Divider />
                    </div>
                  ))}
                </List>
              ) : (
                <Typography sx={{ p: 2 }}>{t('nenhumaOS')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader
              title={t('ultimasVendas')}
              avatar={<DirectionsCarIcon color="primary" />}
            />
            <CardContent sx={{ p: 0 }}>
              {ultimasVendas.length > 0 ? (
                <List disablePadding>
                  {ultimasVendas.map((venda) => (
                    <div key={venda.id}>
                      <ListItemButton component={Link} to={`/vendas-carros?highlight=${venda.id}`} sx={{ px: 2, py: 1 }}>
                        <ListItemText
                          primary={`${venda.fabricante} ${venda.modelo} (${venda.ano})`}
                          secondary={
                            <>
                              <Typography component="span" variant="body2">
                                {venda.kilometragem.toLocaleString('pt-BR')} km
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2" color="primary" fontWeight="bold">
                                {formatCurrency(venda.valor)}
                              </Typography>
                            </>
                          }
                        />
                      </ListItemButton>
                      <Divider />
                    </div>
                  ))}
                </List>
              ) : (
                <Typography sx={{ p: 2 }}>{t('nenhumaVenda')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Snackbar de feedback de ações ───────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.tipo}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
