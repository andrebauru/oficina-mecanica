import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';
import dayjs, { Dayjs } from 'dayjs';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import html2pdf from 'html2pdf.js';
import HirataLogoRaw from '../assets/Hirata Logo.svg?raw';
const LOGO_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(HirataLogoRaw)}`;
import { formatCurrency } from '../utils/formatters';

interface OrdemServico {
  id: string;
  veiculoId: string | null;
  dataEntrada: string;
  dataSaida: string | null;
  status: string;
  descricao: string;
  valorTotal: number;
  parcelas?: number;
  juros?: number;
}

interface VendaCarro {
  id: string;
  fabricante: string;
  modelo: string;
  ano: number;
  kilometragem: number;
  valor: number;
  valorTotal?: number;
  parcelas?: number;
  juros?: number;
}

interface Configuracao {
  nomeEmpresa?: string;
  endereco?: string;
  telefone?: string;
  numeroAutorizacao?: string;
}

const tiposRelatorio = [
  { value: 'servicos', label: 'Ordens de Serviço' },
  { value: 'vendas', label: 'Vendas de Carros' },
  { value: 'bilingue', label: 'Bilíngue (PT/JP)' },
];

const GerarRelatorio = () => {
  const [tipo, setTipo] = useState('servicos');
  const [filtro, setFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState<Dayjs | null>(null);
  const [dataFim, setDataFim] = useState<Dayjs | null>(null);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [vendasCarros, setVendasCarros] = useState<VendaCarro[]>([]);
  const [config, setConfig] = useState<Configuracao>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('http://localhost:3001/ordens_servico'),
      axios.get('http://localhost:3001/vendas_carros'),
      axios.get('http://localhost:3001/configuracoes').catch(() => ({ data: [] })),
    ]).then(([ordensRes, vendasRes, configRes]) => {
      setOrdensServico(ordensRes.data);
      setVendasCarros(vendasRes.data);
      const items: Configuracao[] = configRes.data;
      if (items.length > 0) setConfig(items[0]);
    }).finally(() => setLoading(false));
  }, []);

  const handleTipoChange = (event: SelectChangeEvent) => {
    setTipo(event.target.value);
  };

  const handleGerarPDF = () => {
    const element = document.getElementById('relatorio-pdf');
    if (!element) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `relatorio-${tipo}-${dayjs().format('YYYY-MM-DD')}.pdf`,
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  };

  const periodoTexto = () => {
    if (dataInicio && dataFim) return `${dataInicio.format('DD/MM/YYYY')} até ${dataFim.format('DD/MM/YYYY')}`;
    if (dataInicio) return `A partir de ${dataInicio.format('DD/MM/YYYY')}`;
    if (dataFim) return `Até ${dataFim.format('DD/MM/YYYY')}`;
    return 'Todo o período';
  };

  const filtrarOrdensServico = (): OrdemServico[] => {
    return ordensServico.filter(os => {
      const dataOS = os.dataEntrada.split('T')[0];
      if (dataInicio && dataOS < dataInicio.format('YYYY-MM-DD')) return false;
      if (dataFim && dataOS > dataFim.format('YYYY-MM-DD')) return false;
      if (filtro) {
        const t = filtro.toLowerCase();
        return os.status.toLowerCase().includes(t) || os.descricao.toLowerCase().includes(t) || os.id.toLowerCase().includes(t);
      }
      return true;
    });
  };

  const filtrarVendas = (): VendaCarro[] => {
    return vendasCarros.filter(v => {
      if (filtro) {
        const t = filtro.toLowerCase();
        return v.fabricante.toLowerCase().includes(t) || v.modelo.toLowerCase().includes(t) || v.id.toLowerCase().includes(t) || String(v.ano).includes(t);
      }
      return true;
    });
  };

  const bilingue = tipo === 'bilingue';
  const ordensFormatadas = filtrarOrdensServico();
  const vendasFormatadas = filtrarVendas();
  const totalOS = ordensFormatadas.reduce((sum, os) => sum + (os.valorTotal || 0), 0);
  const totalVendas = vendasFormatadas.reduce((sum, v) => sum + (v.valorTotal || v.valor || 0), 0);
  const hasCompanyInfo = config.nomeEmpresa || config.endereco || config.telefone || config.numeroAutorizacao;
  const showOS = tipo === 'servicos' || tipo === 'bilingue';
  const showVendas = tipo === 'vendas' || tipo === 'bilingue';

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Gerar Relatório PDF</Typography>

      {/* Controls — fora do #relatorio-pdf, nunca exportados */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="tipo-label">Tipo de Relatório</InputLabel>
                <Select labelId="tipo-label" value={tipo} label="Tipo de Relatório" onChange={handleTipoChange}>
                  {tiposRelatorio.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={8}>
              <TextField fullWidth label="Filtro de texto (opcional)" value={filtro}
                onChange={e => setFiltro(e.target.value)}
                placeholder="Status, descrição, fabricante, modelo..." />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                <DatePicker label="Data Início" value={dataInicio} onChange={v => setDataInicio(v)}
                  maxDate={dataFim ?? undefined} slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                <DatePicker label="Data Fim" value={dataFim} onChange={v => setDataFim(v)}
                  minDate={dataInicio ?? undefined} slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button variant="contained" color="primary" startIcon={<PictureAsPdfIcon />}
                fullWidth onClick={handleGerarPDF} sx={{ height: 56 }} disabled={loading}>
                Gerar PDF
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <Box
          id="relatorio-pdf"
          sx={{ p: 3, background: '#fff', borderRadius: 2, position: 'relative', minHeight: 400 }}
        >
          {/* Watermark */}
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
          }}>
            <img src={LOGO_DATA_URL} alt="" aria-hidden="true"
              style={{ width: '85%', opacity: 0.4 }} />
          </Box>

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid #0d47a1' }}>
              <Typography variant="h5" fontWeight="bold" color="primary" mb={0.5}>
                {bilingue ? '車両サービス総合レポート / Relatório Completo' : tiposRelatorio.find(t => t.value === tipo)?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {bilingue ? '期間 / Período' : 'Período'}: {periodoTexto()}
              </Typography>
              {filtro && (
                <Typography variant="body2" color="text.secondary">
                  {bilingue ? 'フィルター / Filtro' : 'Filtro'}: {filtro}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {bilingue ? '発行日 / Emitido em' : 'Emitido em'}: {dayjs().format('DD/MM/YYYY HH:mm')}
              </Typography>
            </Box>

            {/* Ordens de Serviço */}
            {showOS && (
              <Box mb={4}>
                <Typography variant="h6" fontWeight="bold" mb={1.5} color="primary">
                  {bilingue ? '修理依頼 / Ordens de Serviço' : 'Ordens de Serviço'}
                </Typography>
                {ordensFormatadas.length === 0 ? (
                  <Typography color="text.secondary" fontStyle="italic">
                    {bilingue ? '記録なし / Nenhum registro encontrado.' : 'Nenhum registro encontrado.'}
                  </Typography>
                ) : (
                  <TableContainer component={Paper} elevation={1}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                          <TableCell><strong>ID</strong></TableCell>
                          <TableCell><strong>{bilingue ? '入庫日 / Data Entrada' : 'Data Entrada'}</strong></TableCell>
                          <TableCell><strong>{bilingue ? '状態 / Status' : 'Status'}</strong></TableCell>
                          <TableCell><strong>{bilingue ? '説明 / Descrição' : 'Descrição'}</strong></TableCell>
                          {bilingue && <>
                            <TableCell align="right"><strong>分割 / Parcelas</strong></TableCell>
                            <TableCell align="right"><strong>利息 / Juros</strong></TableCell>
                          </>}
                          <TableCell align="right"><strong>{bilingue ? '合計金額 / Valor Total' : 'Valor Total'}</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ordensFormatadas.map((os, i) => (
                          <TableRow key={os.id} sx={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <TableCell>{os.id}</TableCell>
                            <TableCell>{dayjs(os.dataEntrada).format('DD/MM/YYYY')}</TableCell>
                            <TableCell>{os.status}</TableCell>
                            <TableCell>{os.descricao}</TableCell>
                            {bilingue && <>
                              <TableCell align="right">{os.parcelas ?? 1}x</TableCell>
                              <TableCell align="right">{os.juros ?? 0}%</TableCell>
                            </>}
                            <TableCell align="right">{formatCurrency(os.valorTotal || 0)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                          <TableCell colSpan={bilingue ? 6 : 4}>
                            <strong>{bilingue ? '合計 / Total' : 'Total'} ({ordensFormatadas.length} registros)</strong>
                          </TableCell>
                          <TableCell align="right"><strong>{formatCurrency(totalOS)}</strong></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Vendas de Carros */}
            {showVendas && (
              <Box mb={4}>
                <Typography variant="h6" fontWeight="bold" mb={1.5} sx={{ color: '#2e7d32' }}>
                  {bilingue ? '車両販売 / Vendas de Carros' : 'Vendas de Carros'}
                </Typography>
                {vendasFormatadas.length === 0 ? (
                  <Typography color="text.secondary" fontStyle="italic">
                    {bilingue ? '記録なし / Nenhum registro encontrado.' : 'Nenhum registro encontrado.'}
                  </Typography>
                ) : (
                  <TableContainer component={Paper} elevation={1}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                          <TableCell><strong>ID</strong></TableCell>
                          <TableCell><strong>{bilingue ? 'メーカー / Fabricante' : 'Fabricante'}</strong></TableCell>
                          <TableCell><strong>{bilingue ? 'モデル / Modelo' : 'Modelo'}</strong></TableCell>
                          <TableCell><strong>{bilingue ? '年式 / Ano' : 'Ano'}</strong></TableCell>
                          <TableCell align="right"><strong>{bilingue ? '走行距離 / Km' : 'Km'}</strong></TableCell>
                          {bilingue && <>
                            <TableCell align="right"><strong>分割 / Parcelas</strong></TableCell>
                            <TableCell align="right"><strong>利息 / Juros</strong></TableCell>
                          </>}
                          <TableCell align="right"><strong>{bilingue ? '価格 / Valor' : 'Valor'}</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vendasFormatadas.map((v, i) => (
                          <TableRow key={v.id} sx={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <TableCell>{v.id}</TableCell>
                            <TableCell>{v.fabricante}</TableCell>
                            <TableCell>{v.modelo}</TableCell>
                            <TableCell>{v.ano}</TableCell>
                            <TableCell align="right">{v.kilometragem?.toLocaleString('pt-BR')} km</TableCell>
                            {bilingue && <>
                              <TableCell align="right">{v.parcelas ?? 1}x</TableCell>
                              <TableCell align="right">{v.juros ?? 0}%</TableCell>
                            </>}
                            <TableCell align="right">{formatCurrency(v.valorTotal || v.valor || 0)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                          <TableCell colSpan={bilingue ? 7 : 5}>
                            <strong>{bilingue ? '合計 / Total' : 'Total'} ({vendasFormatadas.length} registros)</strong>
                          </TableCell>
                          <TableCell align="right"><strong>{formatCurrency(totalVendas)}</strong></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Grand total (bilingue) */}
            {bilingue && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f3e5f5', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography fontWeight="bold" sx={{ color: '#6a1b9a' }}>
                  総合計 / Total Geral
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#6a1b9a' }}>
                  {formatCurrency(totalOS + totalVendas)}
                </Typography>
              </Box>
            )}

            {/* Company Footer */}
            {hasCompanyInfo && (
              <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #bbb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                  {config.nomeEmpresa && <Typography variant="body2" fontWeight="bold">{config.nomeEmpresa}</Typography>}
                  {config.endereco && <Typography variant="body2" color="text.secondary">{config.endereco}</Typography>}
                  {config.telefone && <Typography variant="body2" color="text.secondary">Tel: {config.telefone}</Typography>}
                  {config.numeroAutorizacao && <Typography variant="body2" color="text.secondary">Autorização: {config.numeroAutorizacao}</Typography>}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {dayjs().format('DD/MM/YYYY HH:mm')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GerarRelatorio;
