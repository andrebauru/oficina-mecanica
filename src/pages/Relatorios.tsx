import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Button, TextField, MenuItem, Box, Typography, Select, InputLabel, FormControl,
  Grid, Card, CardContent, Paper, TableContainer, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Alert, CircularProgress, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';

import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import html2pdf from "html2pdf.js";
import HirataLogo from '../assets/Hirata Logo.svg';

import { formatCurrency } from "../utils/formatters";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ── Bilingual Text Object ──────────────────────────────────────────────────
const TEXTS = {
  // Header
  pageTitle: { pt: "Livro Caixa", jp: "金銭出納帳" },
  monthlyFinancialReport: { pt: "Relatório Financeiro Mensal", jp: "月次財務報告" },
  generatePdf: { pt: "Gerar PDF", jp: "PDF生成" },
  newTransaction: { pt: "Nova Transação", jp: "新規取引" },
  // Filters
  period: { pt: "Período", jp: "期間" },
  month: { pt: "Mês", jp: "月" },
  year: { pt: "Ano", jp: "年" },
  // Summary Cards
  totalIncome: { pt: "Total Entradas", jp: "収入合計" },
  totalOutcome: { pt: "Total Saídas", jp: "支出合計" },
  totalProfitLoss: { pt: "Lucro e Perda Total", jp: "損益通算" },
  // Chart
  chartTitle: { pt: "Fluxo de Caixa Anual", jp: "年間キャッシュフロー" },
  chartLabelIncome: { pt: "Entradas", jp: "収入" },
  chartLabelOutcome: { pt: "Saídas", jp: "支出" },
  // Transactions Table
  transactions: { pt: "Transações", jp: "取引" },
  records: { pt: "registro(s)", jp: "件" },
  noTransactions: { pt: "Nenhuma transação neste período.", jp: "この期間の取引はありません。" },
  clickNewTransaction: { pt: "Clique em \"Nova Transação\" para adicionar.", jp: "「新規取引」をクリックして追加してください。" },
  date: { pt: "Data", jp: "日付" },
  category: { pt: "Categoria", jp: "カテゴリ" },
  type: { pt: "Tipo", jp: "種類" },
  value: { pt: "Valor", jp: "金額" },
  description: { pt: "Descrição", jp: "摘要" },
  actions: { pt: "Ações", jp: "操作" },
  // Summary Table
  summary: { pt: "Resumo", jp: "摘要" },
  income: { pt: "Entrada", jp: "収入金額" },
  expense: { pt: "Saída", jp: "支払金額" },
  balance: { pt: "Saldo", jp: "差引残高" },
  total: { pt: "Total", jp: "合計" },
  // Modal
  editTransaction: { pt: "Editar Transação", jp: "取引の編集" },
  formDate: { pt: "Data", jp: "日付" },
  formType: { pt: "Tipo", jp: "種類" },
  formCategory: { pt: "Categoria", jp: "カテゴリ" },
  formValue: { pt: "Valor (¥)", jp: "金額 (¥)" },
  formDescription: { pt: "Descrição", jp: "摘要" },
  formDescriptionPlaceholder: { pt: "Detalhes opcionais…", jp: "詳細（任意）" },
  cancel: { pt: "Cancelar", jp: "キャンセル" },
  save: { pt: "Salvar", jp: "保存" },
  add: { pt: "Adicionar", jp: "追加" },
  // Delete confirmation
  confirmDelete: { pt: "Confirmar Exclusão", jp: "削除の確認" },
  confirmDeleteMessage: { pt: "Deseja excluir esta transação permanentemente?", jp: "この取引を完全に削除しますか？" },
  delete: { pt: "Excluir", jp: "削除" },
  // Snackbar messages
  fillRequiredFields: { pt: "Preencha todos os campos obrigatórios", jp: "すべての必須項目を入力してください" },
  updateSuccess: { pt: "Transação atualizada com sucesso", jp: "取引が正常に更新されました" },
  addSuccess: { pt: "Transação adicionada com sucesso", jp: "取引が正常に追加されました" },
  saveError: { pt: "Erro ao salvar transação", jp: "取引の保存中にエラーが発生しました" },
  deleteSuccess: { pt: "Transação excluída com sucesso", jp: "取引が正常に削除されました" },
  deleteError: { pt: "Erro ao excluir transação", jp: "取引の削除中にエラーが発生しました" },
  loadError: { pt: "Erro ao carregar dados financeiros", jp: "財務データの読み込み中にエラーが発生しました" },
};

// ── Types ────────────────────────────────────────────────────────────────────
interface Transacao {
  id: string;
  data: string;
  categoria: string;
  tipo: 'Entrada' | 'Saída';
  valor: number;
  descricao?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

type TransacaoFormData = Omit<Transacao, 'id' | 'valor'> & { valor: number | '' };

const transacaoVazia: TransacaoFormData = {
  data: new Date().toISOString().split('T')[0],
  categoria: '',
  tipo: 'Entrada',
  valor: 0,
  descricao: '',
};

// ── Constants ────────────────────────────────────────────────────────────────
const MESES = [
  { pt: "Janeiro", jp: "1月" }, { pt: "Fevereiro", jp: "2月" }, { pt: "Março", jp: "3月" },
  { pt: "Abril", jp: "4月" }, { pt: "Maio", jp: "5月" }, { pt: "Junho", jp: "6月" },
  { pt: "Julho", jp: "7月" }, { pt: "Agosto", jp: "8月" }, { pt: "Setembro", jp: "9月" },
  { pt: "Outubro", jp: "10月" }, { pt: "Novembro", jp: "11月" }, { pt: "Dezembro", jp: "12月" },
];

const GRUPOS = ["Receitas Operacionais", "Custos Variáveis", "Despesas Fixas", "Outras Receitas/Despesas", "Impostos"];
const GRUPO_CORES: { [key: string]: { bg: string, color: string } } = {
  "Receitas Operacionais": { bg: '#e3f2fd', color: '#0d47a1' },
  "Custos Variáveis": { bg: '#fff3e0', color: '#e65100' },
  "Despesas Fixas": { bg: '#fce4ec', color: '#880e4f' },
  "Outras Receitas/Despesas": { bg: '#f3e5f5', color: '#4a148c' },
  "Impostos": { bg: '#e8f5e9', color: '#1b5e20' },
};

const CATEGORIAS_ORDENADAS: { nome: string; tipo: 'Entrada' | 'Saída'; grupo: string; japones: string }[] = [
    // Receitas Operacionais
    { nome: "Receita de negócios",        tipo: "Entrada", grupo: "Receitas Operacionais",      japones: "事業収入" },
    { nome: "Vendas de Peças",            tipo: "Entrada", grupo: "Receitas Operacionais",      japones: "部品販売" },
    { nome: "Serviços de Mão de Obra",    tipo: "Entrada", grupo: "Receitas Operacionais",      japones: "工賃サービス" },
    { nome: "Vendas de Veículos",         tipo: "Entrada", grupo: "Receitas Operacionais",      japones: "車両販売" },

    // Custos Variáveis
    { nome: "Gasolina",                   tipo: "Saída",   grupo: "Custos Variáveis",           japones: "燃料費" },
    { nome: "Reparação",                  tipo: "Saída",   grupo: "Custos Variáveis",           japones: "修繕費" },
    { nome: "Compra de Peças",            tipo: "Saída",   grupo: "Custos Variáveis",           japones: "部品購入" },
    { nome: "Material de escritório",     tipo: "Saída",   grupo: "Custos Variáveis",           japones: "事務用品" },
    { nome: "Materiais de Consumo Oficina", tipo: "Saída", grupo: "Custos Variáveis",           japones: "作業消耗品" },

    // Despesas Fixas
    { nome: "Salários e Encargos",        tipo: "Saída",   grupo: "Despesas Fixas",             japones: "給与・福利厚生" },
    { nome: "Aluguel e estacionamento",   tipo: "Saída",   grupo: "Despesas Fixas",             japones: "家賃・駐車場" },
    { nome: "Aluguel",                    tipo: "Saída",   grupo: "Despesas Fixas",             japones: "家賃" },
    { nome: "Água/Luz/Gas",               tipo: "Saída",   grupo: "Despesas Fixas",             japones: "水道光熱費" },
    { nome: "Contas de Consumo",          tipo: "Saída",   grupo: "Despesas Fixas",             japones: "光熱費" },
    { nome: "Telefone e internet",        tipo: "Saída",   grupo: "Despesas Fixas",             japones: "通信費" },
    { nome: "Marketing",                  tipo: "Saída",   grupo: "Despesas Fixas",             japones: "広告費" },
    { nome: "Marketing e Publicidade",    tipo: "Saída",   grupo: "Despesas Fixas",             japones: "広告宣伝費" },
    { nome: "Software e Ferramentas",     tipo: "Saída",   grupo: "Despesas Fixas",             japones: "ソフトウェア・工具" },

    // Outras Receitas/Despesas
    { nome: "Outras receitas",            tipo: "Entrada", grupo: "Outras Receitas/Despesas",   japones: "その他収入" },
    { nome: "Juros de Empréstimos",       tipo: "Saída",   grupo: "Outras Receitas/Despesas",   japones: "支払利息" },
    { nome: "Receitas de Juros",          tipo: "Entrada", grupo: "Outras Receitas/Despesas",   japones: "受取利息" },

    // Impostos
    { nome: "Impostos e taxas públicas",  tipo: "Saída",   grupo: "Impostos",                   japones: "税金・公課" },
    { nome: "Impostos sobre Vendas",      tipo: "Saída",   grupo: "Impostos",                   japones: "売上税" },
    { nome: "Impostos sobre Lucro",       tipo: "Saída",   grupo: "Impostos",                   japones: "法人税" },
];

const Relatorios: React.FC = () => {
    const [transacoes, setTransacoes] = useState<Transacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [openForm, setOpenForm] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [transacaoParaDeletar, setTransacaoParaDeletar] = useState<string | null>(null);
    const [formData, setFormData] = useState<TransacaoFormData>(transacaoVazia);
    const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });
    
    const [mesSelecionado, setMesSelecionado] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [anoSelecionado, setAnoSelecionado] = useState(String(new Date().getFullYear()));
    const [visaoAnual, setVisaoAnual] = useState(false);
    
    const [transacoesFiltradas, setTransacoesFiltradas] = useState<Transacao[]>([]);
    const [totalEntradas, setTotalEntradas] = useState(0);
    const [totalSaidas, setTotalSaidas] = useState(0);
    const [lucroPerda, setLucroPerda] = useState(0);
    const [anos, setAnos] = useState<string[]>([]);
    
    const relatorioRef = useRef<HTMLDivElement>(null);
    const anoInicialRef = useRef(anoSelecionado);

    const fetchTransacoes = useCallback(async (): Promise<string[]> => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3001/financeiro');
            const data = res.data as Transacao[];
            setTransacoes(data);
            const years = [...new Set(data.map((t: Transacao) => t.data.split('-')[0]))].sort().reverse();
            setAnos(years);
            return years;
        } catch (error) {
            console.error("Erro ao buscar transações:", error);
            setSnackbar({ open: true, message: `${TEXTS.loadError.jp} / ${TEXTS.loadError.pt}`, severity: 'error' });
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const anoInicial = anoInicialRef.current;
        fetchTransacoes().then(years => {
            if (years.length > 0 && !years.includes(anoInicial)) {
                setAnoSelecionado(years[0]);
            }
        });
    }, [fetchTransacoes]);

    useEffect(() => {
        const filtradas = transacoes.filter(t => {
            const [ano, mes] = t.data.split('-');
            if (visaoAnual) return ano === anoSelecionado;
            return ano === anoSelecionado && mes === mesSelecionado;
        });
        setTransacoesFiltradas(filtradas);

        const entradas = filtradas.filter(t => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
        setTotalEntradas(entradas);

        const saidas = filtradas.filter(t => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0);
        setTotalSaidas(saidas);

        setLucroPerda(entradas - saidas);
    }, [transacoes, anoSelecionado, mesSelecionado, visaoAnual]);


    const getValorCategoria = (nome: string, tipo: 'Entrada' | 'Saída'): number => {
        return transacoesFiltradas
            .filter(t => t.categoria === nome && t.tipo === tipo)
            .reduce((acc, t) => acc + t.valor, 0);
    };

    const dadosMensais = MESES.map((_, idx) => {
        const mes = String(idx + 1).padStart(2, '0');
        const doMes = transacoes.filter(t => {
            const [ano, m] = t.data.split('-');
            return ano === anoSelecionado && m === mes;
        });
        return {
            entradas: doMes.filter(t => t.tipo === 'Entrada').reduce((a, t) => a + t.valor, 0),
            saidas:   doMes.filter(t => t.tipo === 'Saída').reduce((a, t)   => a + t.valor, 0),
        };
    });
    
    const chartData = {
        labels: MESES.map(m => `${m.jp}/${m.pt.substring(0, 3)}`),
        datasets: [
            {
                label: `${TEXTS.chartLabelIncome.jp} / ${TEXTS.chartLabelIncome.pt}`,
                data: dadosMensais.map(d => d.entradas),
                backgroundColor: 'rgba(25, 118, 210, 0.75)',
                borderColor: 'rgba(25, 118, 210, 1)',
                borderWidth: 1,
            },
            {
                label: `${TEXTS.chartLabelOutcome.jp} / ${TEXTS.chartLabelOutcome.pt}`,
                data: dadosMensais.map(d => d.saidas),
                backgroundColor: 'rgba(211, 47, 47, 0.75)',
                borderColor: 'rgba(211, 47, 47, 1)',
                borderWidth: 1,
            },
        ],
    };
    
    const chartOptions: ChartOptions<'bar'> = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            title: {
                display: true,
                text: `${TEXTS.chartTitle.jp} / ${TEXTS.chartTitle.pt} — ${anoSelecionado}`,
                font: { size: 14 },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: number | string) => formatCurrency(Number(value)),
                },
            },
        },
    };

    const handleOpenForm = (transacao?: Transacao) => {
        if (transacao) {
            setFormData({
                data: transacao.data,
                categoria: transacao.categoria,
                tipo: transacao.tipo,
                valor: transacao.valor,
                descricao: transacao.descricao,
            });
            setEditingId(transacao.id);
        } else {
            setFormData(transacaoVazia);
            setEditingId(null);
        }
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setOpenForm(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'valor' ? (value === '' ? '' : Number(value)) : value,
        }));
    };
    
    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as string }));
    };

    const handleOpenDelete = (id: string) => {
        setTransacaoParaDeletar(id);
        setOpenDelete(true);
    };

    const handleCloseDelete = () => {
        setOpenDelete(false);
        setTransacaoParaDeletar(null);
    };

    const handleSubmit = async () => {
        if (!formData.categoria || !formData.data || formData.valor === '') {
            setSnackbar({ open: true, message: `${TEXTS.fillRequiredFields.jp} / ${TEXTS.fillRequiredFields.pt}`, severity: 'warning' });
            return;
        }
        try {
            const payload = { ...formData, valor: Number(formData.valor) };
            if (editingId) {
                await axios.put(`http://localhost:3001/financeiro/${editingId}`, payload);
                setSnackbar({ open: true, message: `${TEXTS.updateSuccess.jp} / ${TEXTS.updateSuccess.pt}`, severity: 'success' });
            } else {
                await axios.post('http://localhost:3001/financeiro', payload);
                setSnackbar({ open: true, message: `${TEXTS.addSuccess.jp} / ${TEXTS.addSuccess.pt}`, severity: 'success' });
            }
            handleCloseForm();
            fetchTransacoes();
        } catch {
            setSnackbar({ open: true, message: `${TEXTS.saveError.jp} / ${TEXTS.saveError.pt}`, severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!transacaoParaDeletar) return;
        try {
            await axios.delete(`http://localhost:3001/financeiro/${transacaoParaDeletar}`);
            setSnackbar({ open: true, message: `${TEXTS.deleteSuccess.jp} / ${TEXTS.deleteSuccess.pt}`, severity: 'success' });
            fetchTransacoes();
        } catch {
            setSnackbar({ open: true, message: `${TEXTS.deleteError.jp} / ${TEXTS.deleteError.pt}`, severity: 'error' });
        }
        handleCloseDelete();
    };

    const handleGerarPDF = () => {
        if (!relatorioRef.current) return;
        const mesNome = MESES.find((_m, i) => String(i+1).padStart(2, '0') === mesSelecionado) || MESES[0];

        if (typeof html2pdf !== 'undefined') {
          html2pdf()
            .set({
              margin: 8,
              filename: `${TEXTS.pageTitle.jp}_${mesNome.jp}_${anoSelecionado}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, allowTaint: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            })
            .from(relatorioRef.current)
            .save();
        } else {
          window.print();
        }
    };

    const mesNomeSelecionado = MESES.find((_m, i) => String(i+1).padStart(2, '0') === mesSelecionado) || {pt: '', jp: ''};

    return (
        <Box sx={{ flexGrow: 1 }}>
            
            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <Box sx={{
                display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2, mb: 3,
            }}>
                <Box>
                    <Typography variant="h4" sx={{ mb: 0, fontWeight: 'bold' }}>
                        {TEXTS.pageTitle.jp}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {TEXTS.monthlyFinancialReport.pt}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined" color="error"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={handleGerarPDF}
                    >
                        {`${TEXTS.generatePdf.jp} / ${TEXTS.generatePdf.pt}`}
                    </Button>
                    <Button
                        variant="contained" color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenForm()}
                    >
                        {`${TEXTS.newTransaction.jp} / ${TEXTS.newTransaction.pt}`}
                    </Button>
                </Box>
            </Box>
            
            {/* ── Period Filters ─────────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">{`${TEXTS.period.jp} / ${TEXTS.period.pt}:`}</Typography>
                <ToggleButtonGroup
                    value={visaoAnual ? 'anual' : 'mensal'}
                    exclusive
                    size="small"
                    onChange={(_e, val) => { if (val !== null) setVisaoAnual(val === 'anual'); }}
                >
                    <ToggleButton value="mensal">月次 / Mensal</ToggleButton>
                    <ToggleButton value="anual">年次 / Anual</ToggleButton>
                </ToggleButtonGroup>
                {!visaoAnual && (
                    <FormControl size="small" sx={{ minWidth: 145 }}>
                        <InputLabel>{`${TEXTS.month.jp} / ${TEXTS.month.pt}`}</InputLabel>
                        <Select value={mesSelecionado} label={`${TEXTS.month.jp} / ${TEXTS.month.pt}`} onChange={e => setMesSelecionado(e.target.value)}>
                            {MESES.map((mes, idx) => (
                                <MenuItem key={idx} value={String(idx + 1).padStart(2, '0')}>{`${mes.jp} / ${mes.pt}`}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
                <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>{`${TEXTS.year.jp} / ${TEXTS.year.pt}`}</InputLabel>
                    <Select value={anoSelecionado} label={`${TEXTS.year.jp} / ${TEXTS.year.pt}`} onChange={e => setAnoSelecionado(e.target.value)}>
                        {anos.map(ano => <MenuItem key={ano} value={ano}>{ano}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>
            
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <div ref={relatorioRef} style={{ position: 'relative' }}>
                    <img
                        src={HirataLogo}
                        alt=""
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '60%',
                            opacity: 0.5,
                            pointerEvents: 'none',
                            zIndex: 0,
                        }}
                    />
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                    {/* ── Summary Cards ──────────────────────────────────────────────── */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
                            <Card elevation={3} sx={{ borderLeft: '4px solid #1976d2' }}>
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '14px !important' }}>
                                    <TrendingUpIcon color="primary" sx={{ fontSize: 38 }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">{`${TEXTS.totalIncome.jp} / ${TEXTS.totalIncome.pt}`}</Typography>
                                        <Typography variant="h6" color="primary" fontWeight="bold">{formatCurrency(totalEntradas)}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card elevation={3} sx={{ borderLeft: '4px solid #d32f2f' }}>
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '14px !important' }}>
                                    <TrendingDownIcon color="error" sx={{ fontSize: 38 }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">{`${TEXTS.totalOutcome.jp} / ${TEXTS.totalOutcome.pt}`}</Typography>
                                        <Typography variant="h6" color="error" fontWeight="bold">{formatCurrency(totalSaidas)}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card elevation={3} sx={{ borderLeft: `4px solid ${lucroPerda >= 0 ? '#2e7d32' : '#d32f2f'}` }}>
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '14px !important' }}>
                                    <AccountBalanceIcon sx={{ fontSize: 38, color: lucroPerda >= 0 ? '#2e7d32' : '#d32f2f' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">{`${TEXTS.totalProfitLoss.jp} / ${TEXTS.totalProfitLoss.pt}`}</Typography>
                                        <Typography variant="h6" fontWeight="bold" sx={{ color: lucroPerda >= 0 ? '#2e7d32' : '#d32f2f' }}>
                                            {formatCurrency(lucroPerda)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    
                    {/* ── Annual Bar Chart ───────────────────────────────────────────── */}
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Bar data={chartData} options={chartOptions} />
                    </Paper>
                    
                    {/* ── 金銭出納帳 Table (image-style) ─────────────────────────────── */}
                    <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
                        <Box sx={{ p: 2, backgroundColor: '#0d47a1', color: 'white', textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight="bold">{`${TEXTS.pageTitle.jp} / ${TEXTS.pageTitle.pt}`}</Typography>
                            <Typography variant="body2">
                                {visaoAnual
                                    ? `年次 / Resumo Anual — ${anoSelecionado}`
                                    : `${mesSelecionado}月分 — ${mesNomeSelecionado.jp} / ${mesNomeSelecionado.pt} / ${anoSelecionado}`}
                            </Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#1565c0' }}>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '42%' }}>
                                            {`${TEXTS.summary.jp} / ${TEXTS.summary.pt}`}
                                        </TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                                            {`${TEXTS.income.jp} / ${TEXTS.income.pt}`}
                                        </TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                                            {`${TEXTS.expense.jp} / ${TEXTS.expense.pt}`}
                                        </TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                                            {`${TEXTS.balance.jp} / ${TEXTS.balance.pt}`}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {GRUPOS.map(grupo => {
                                        const cores = GRUPO_CORES[grupo] ?? { bg: '#f5f5f5', color: '#333' };
                                        const categoriasDoGrupo = CATEGORIAS_ORDENADAS.filter(c => c.grupo === grupo);
                                        const temValoresNoGrupo = categoriasDoGrupo.some(cat => getValorCategoria(cat.nome, cat.tipo) > 0);
                                        if(!temValoresNoGrupo) return null;

                                        return (
                                            <React.Fragment key={grupo}>
                                                <TableRow sx={{ backgroundColor: cores.bg }}>
                                                    <TableCell
                                                        colSpan={4}
                                                        sx={{ fontWeight: 'bold', color: cores.color, fontSize: '0.78rem', py: 0.6 }}
                                                    >
                                                        ■ {grupo}
                                                    </TableCell>
                                                </TableRow>
                                                {categoriasDoGrupo.map(cat => {
                                                    const valor = getValorCategoria(cat.nome, cat.tipo);
                                                    const entradaVal = cat.tipo === 'Entrada' ? valor : 0;
                                                    const saidaVal   = cat.tipo === 'Saída'   ? valor : 0;
                                                    if (valor === 0) return null;
                                                    return (
                                                        <TableRow
                                                            key={cat.nome}
                                                            sx={{
                                                                backgroundColor: '#ffffff',
                                                                '&:hover': { backgroundColor: '#f0f7ff' },
                                                            }}
                                                        >
                                                            <TableCell sx={{ py: 0.5 }}>
                                                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 'bold' }}>
                                                                    {cat.japones}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {cat.nome}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ color: '#1976d2', fontWeight: 'bold', py: 0.5, fontSize: '0.85rem' }}>
                                                                {entradaVal > 0 ? formatCurrency(entradaVal) : ''}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ color: '#d32f2f', fontWeight: 'bold', py: 0.5, fontSize: '0.85rem' }}>
                                                                {saidaVal > 0 ? formatCurrency(saidaVal) : ''}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ color: '#555', py: 0.5, fontSize: '0.82rem' }}>
                                                                {formatCurrency(entradaVal - saidaVal)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                    

                                    {/* ── Total rows ─────────────────────────────────────────── */}
                                    <TableRow sx={{ backgroundColor: '#0d47a1' }}>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{`${TEXTS.totalProfitLoss.jp} / ${TEXTS.totalProfitLoss.pt}`}</TableCell>
                                        <TableCell align="right" sx={{ color: '#90caf9', fontWeight: 'bold' }}>{formatCurrency(totalEntradas)}</TableCell>
                                        <TableCell align="right" sx={{ color: '#ef9a9a', fontWeight: 'bold' }}>{formatCurrency(totalSaidas)}</TableCell>
                                        <TableCell align="right" sx={{ color: lucroPerda >= 0 ? '#a5d6a7' : '#ef9a9a', fontWeight: 'bold' }}>{formatCurrency(lucroPerda)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                    
                    {/* ── Individual Transactions ────────────────────────────────────── */}
                    <Paper elevation={3} sx={{ mb: 3 }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">
                                {visaoAnual
                                    ? `${TEXTS.transactions.jp} — ${anoSelecionado}`
                                    : `${TEXTS.transactions.jp} — ${mesNomeSelecionado.jp}/${anoSelecionado}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {`${transacoesFiltradas.length} ${TEXTS.records.jp} / ${TEXTS.records.pt}`}
                            </Typography>
                        </Box>
                        <Divider />
                        {transacoesFiltradas.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    {`${TEXTS.noTransactions.jp} ${TEXTS.clickNewTransaction.jp}`}
                                </Typography>
                                <Typography color="text.secondary">
                                    {`${TEXTS.noTransactions.pt} ${TEXTS.clickNewTransaction.pt}`}
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell>{`${TEXTS.date.jp} / ${TEXTS.date.pt}`}</TableCell>
                                            <TableCell>{`${TEXTS.category.jp} / ${TEXTS.category.pt}`}</TableCell>
                                            <TableCell>{`${TEXTS.type.jp} / ${TEXTS.type.pt}`}</TableCell>
                                            <TableCell align="right">{`${TEXTS.value.jp} / ${TEXTS.value.pt}`}</TableCell>
                                            <TableCell>{`${TEXTS.description.jp} / ${TEXTS.description.pt}`}</TableCell>
                                            <TableCell align="center">{`${TEXTS.actions.jp} / ${TEXTS.actions.pt}`}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {[...transacoesFiltradas]
                                            .sort((a, b) => a.data.localeCompare(b.data))
                                            .map(t => (
                                                <TableRow key={t.id} hover>
                                                    <TableCell>
                                                        {new Date(t.data + 'T00:00:00').toLocaleDateString('ja-JP')}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.85rem' }}>
                                                        {CATEGORIAS_ORDENADAS.find(c => c.nome === t.categoria)?.japones}
                                                        <br />
                                                        <Typography variant="caption" color="text.secondary">{t.categoria}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{
                                                            display: 'inline-block',
                                                            backgroundColor: t.tipo === 'Entrada' ? '#e3f2fd' : '#ffebee',
                                                            color: t.tipo === 'Entrada' ? '#1565c0' : '#c62828',
                                                            px: 1, py: 0.2, borderRadius: 1,
                                                            fontSize: '0.75rem', fontWeight: 'bold',
                                                        }}>
                                                            {t.tipo === 'Entrada' ? `${TEXTS.chartLabelIncome.jp} / ${TEXTS.chartLabelIncome.pt}` : `${TEXTS.chartLabelOutcome.jp} / ${TEXTS.chartLabelOutcome.pt}`}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{
                                                        color: t.tipo === 'Entrada' ? '#1976d2' : '#d32f2f',
                                                        fontWeight: 'bold',
                                                    }}>
                                                        {formatCurrency(t.valor)}
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#555' }}>
                                                        {t.descricao || '—'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton size="small" color="primary" onClick={() => handleOpenForm(t)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleOpenDelete(t.id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                    </Box>
                </div>
            )}

            {/* ── Nova/Editar Transação Modal ─────────────────────────────────────── */}
            <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? `${TEXTS.editTransaction.jp} / ${TEXTS.editTransaction.pt}` : `${TEXTS.newTransaction.jp} / ${TEXTS.newTransaction.pt}`}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label={`${TEXTS.formDate.jp} / ${TEXTS.formDate.pt} *`} name="data" type="date"
                            value={formData.data} onChange={handleInputChange}
                            fullWidth InputLabelProps={{ shrink: true }}
                        />
                        <FormControl fullWidth>
                            <InputLabel>{`${TEXTS.formType.jp} / ${TEXTS.formType.pt} *`}</InputLabel>
                            <Select name="tipo" value={formData.tipo} label={`${TEXTS.formType.jp} / ${TEXTS.formType.pt} *`} onChange={handleSelectChange}>
                                <MenuItem value="Entrada">{`${TEXTS.chartLabelIncome.jp} / ${TEXTS.chartLabelIncome.pt}`}</MenuItem>
                                <MenuItem value="Saída">{`${TEXTS.chartLabelOutcome.jp} / ${TEXTS.chartLabelOutcome.pt}`}</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>{`${TEXTS.formCategory.jp} / ${TEXTS.formCategory.pt} *`}</InputLabel>
                            <Select name="categoria" value={formData.categoria} label={`${TEXTS.formCategory.jp} / ${TEXTS.formCategory.pt} *`} onChange={handleSelectChange}>
                                {GRUPOS.flatMap(grupo => {
                                    const cores = GRUPO_CORES[grupo] ?? { bg: '#f5f5f5', color: '#333' };
                                    return [
                                        <MenuItem
                                            key={`hdr-${grupo}`} disabled
                                            sx={{ fontWeight: 'bold', color: cores.color, opacity: '1 !important', fontSize: '0.8rem' }}
                                        >
                                            ── {grupo} ──
                                        </MenuItem>,
                                        ...CATEGORIAS_ORDENADAS.filter(c => c.grupo === grupo).map(cat => (
                                            <MenuItem key={cat.nome} value={cat.nome}>
                                                {cat.japones} / {cat.nome}
                                            </MenuItem>
                                        )),
                                    ];
                                })}
                            </Select>
                        </FormControl>
                        <TextField
                            label={`${TEXTS.formValue.jp} / ${TEXTS.formValue.pt} *`} name="valor" type="number"
                            value={formData.valor} onChange={handleInputChange}
                            fullWidth inputProps={{ min: 0, step: 1 }}
                        />
                        <TextField
                            label={`${TEXTS.formDescription.jp} / ${TEXTS.formDescription.pt}`} name="descricao"
                            value={formData.descricao || ''} onChange={handleInputChange}
                            fullWidth multiline rows={2} placeholder={`${TEXTS.formDescriptionPlaceholder.jp} / ${TEXTS.formDescriptionPlaceholder.pt}`}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseForm}>{`${TEXTS.cancel.jp} / ${TEXTS.cancel.pt}`}</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {editingId ? `${TEXTS.save.jp} / ${TEXTS.save.pt}` : `${TEXTS.add.jp} / ${TEXTS.add.pt}`}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
            <Dialog open={openDelete} onClose={handleCloseDelete} maxWidth="xs">
                <DialogTitle>{`${TEXTS.confirmDelete.jp} / ${TEXTS.confirmDelete.pt}`}</DialogTitle>
                <DialogContent>
                    <Typography>{`${TEXTS.confirmDeleteMessage.jp} / ${TEXTS.confirmDeleteMessage.pt}`}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDelete}>{`${TEXTS.cancel.jp} / ${TEXTS.cancel.pt}`}</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>{`${TEXTS.delete.jp} / ${TEXTS.delete.pt}`}</Button>
                </DialogActions>
            </Dialog>
            
            {/* ── Snackbar ────────────────────────────────────────────────────────── */}
            <Snackbar
                open={snackbar.open} autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Relatorios;
