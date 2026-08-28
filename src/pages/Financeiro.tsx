import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Tabs, Tab, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, CircularProgress,
  Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
  InputAdornment, Chip, TableSortLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrintIcon from '@mui/icons-material/Print';
import { formatCurrency } from '../utils/formatters';
import { useLanguage } from '../components/LanguageContext';

/* ─── Interfaces ─── */
interface Lancamento {
  id: string;
  data: string;
  tipo: string;
  categoria: string;
  valor: number;
  descricao: string;
}

interface Categoria {
  id: string;
  nome: string;
  tipo: string; // 'Entrada' | 'Saída' | 'Ambos'
}

interface LancamentoForm {
  data: string;
  tipo: string;
  categoria: string;
  valor: number | '';
  descricao: string;
}

interface CategoriaForm {
  nome: string;
  tipo: string;
}

interface Parcela {
  id: string;
  venda_id: string;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  status: string;
  data_pagamento: string | null;
  cliente_nome: string;
  cliente_telefone: string;
}

/* ─── TabPanel ─── */
function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

const lancamentoVazio: LancamentoForm = { data: new Date().toISOString().split('T')[0], tipo: 'Saída', categoria: '', valor: '', descricao: '' };
const categoriaVazia: CategoriaForm = { nome: '', tipo: 'Saída' };

/* ═══════════════════════════════════════════ */
const Financeiro = () => {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);

  /* ── Lançamentos state ── */
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [lancFiltrados, setLancFiltrados] = useState<Lancamento[]>([]);
  const [lancLoading, setLancLoading] = useState(true);
  const [lancFiltro, setLancFiltro] = useState('');
  const [lancOrdenacao, setLancOrdenacao] = useState<{ campo: keyof Lancamento | ''; direcao: 'asc' | 'desc' }>({ campo: 'data', direcao: 'desc' });
  const [lancForm, setLancForm] = useState<LancamentoForm>(lancamentoVazio);
  const [lancEditingId, setLancEditingId] = useState<string | null>(null);
  const [openLancForm, setOpenLancForm] = useState(false);
  const [lancParaDeletar, setLancParaDeletar] = useState<string | null>(null);
  const [openLancDelete, setOpenLancDelete] = useState(false);

  /* ── Categorias state ── */
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catFiltradas, setCatFiltradas] = useState<Categoria[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catFiltro, setCatFiltro] = useState('');
  const [catForm, setCatForm] = useState<CategoriaForm>(categoriaVazia);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [openCatForm, setOpenCatForm] = useState(false);
  const [catParaDeletar, setCatParaDeletar] = useState<string | null>(null);
  const [openCatDelete, setOpenCatDelete] = useState(false);

  /* ── Snackbar ── */
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const showMsg = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  /* ── Parcelas state ── */
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [parcelasLoading, setParcelasLoading] = useState(false);
  const [parcelaFiltro, setParcelaFiltro] = useState('');
  const [confirmBaixaId, setConfirmBaixaId] = useState<string | null>(null);
  // Mês selecionado no painel de parcelas (formato YYYY-MM para input type="month")
  const [mesSelecionado, setMesSelecionado] = useState<string>(
    new Date().toISOString().slice(0, 7) // ex: '2026-08'
  );

  /* ─── Fetch ─── */
  const fetchLancamentos = async () => {
    setLancLoading(true);
    try {
      const res = await axios.get('/api/financeiro');
      setLancamentos(res.data);
    } catch { showMsg('Erro ao carregar lançamentos', 'error'); }
    finally { setLancLoading(false); }
  };

  const fetchCategorias = async () => {
    setCatLoading(true);
    try {
      const res = await axios.get('/api/categorias_financeiro');
      setCategorias(res.data);
    } catch { showMsg('Erro ao carregar categorias', 'error'); }
    finally { setCatLoading(false); }
  };

  useEffect(() => { fetchLancamentos(); fetchCategorias(); fetchParcelas(); }, []);

  /* ─── Fetch Parcelas do Mês ─── */
  const fetchParcelas = async (mes?: string) => {
    const alvo = mes || mesSelecionado;
    if (!alvo) return;
    const [ano, mesNum] = alvo.split('-');
    setParcelasLoading(true);
    try {
      const { data } = await axios.get(`/api/parcelas/mes/${ano}/${parseInt(mesNum, 10)}`);
      setParcelas(Array.isArray(data) ? data : []);
    } catch { /* silently fail se a tabela ainda não existir */ }
    finally { setParcelasLoading(false); }
  };

  // Re-busca ao trocar de mês
  useEffect(() => { fetchParcelas(mesSelecionado); }, [mesSelecionado]);

  /* ─── Filtro + Ordenação de Lançamentos ─── */
  useEffect(() => {
    let r = [...lancamentos];
    if (lancFiltro) {
      const t = lancFiltro.toLowerCase();
      r = r.filter(l =>
        l.categoria.toLowerCase().includes(t) ||
        l.tipo.toLowerCase().includes(t) ||
        l.descricao.toLowerCase().includes(t) ||
        l.data.includes(t)
      );
    }
    if (lancOrdenacao.campo) {
      const c = lancOrdenacao.campo;
      r.sort((a, b) => {
        const av = c === 'valor' ? a.valor - b.valor
          : String(a[c]).localeCompare(String(b[c]), 'pt-BR');
        return lancOrdenacao.direcao === 'asc' ? (typeof av === 'number' ? av : 0) || String(a[c]).localeCompare(String(b[c]), 'pt-BR')
          : (typeof av === 'number' ? -av : 0) || String(b[c]).localeCompare(String(a[c]), 'pt-BR');
      });
      if (c === 'valor') {
        r.sort((a, b) => lancOrdenacao.direcao === 'asc' ? a.valor - b.valor : b.valor - a.valor);
      } else {
        r.sort((a, b) => lancOrdenacao.direcao === 'asc'
          ? String(a[c]).localeCompare(String(b[c]), 'pt-BR')
          : String(b[c]).localeCompare(String(a[c]), 'pt-BR'));
      }
    }
    setLancFiltrados(r);
  }, [lancamentos, lancFiltro, lancOrdenacao]);

  /* ─── Filtro de Categorias ─── */
  useEffect(() => {
    if (!catFiltro) { setCatFiltradas(categorias); return; }
    const t = catFiltro.toLowerCase();
    setCatFiltradas(categorias.filter(c => c.nome.toLowerCase().includes(t) || c.tipo.toLowerCase().includes(t)));
  }, [categorias, catFiltro]);

  /* ─── Filtro de Categorias ─── */
  useEffect(() => {
    if (!catFiltro) { setCatFiltradas(categorias); return; }
    const t = catFiltro.toLowerCase();
    setCatFiltradas(categorias.filter(c => c.nome.toLowerCase().includes(t) || c.tipo.toLowerCase().includes(t)));
  }, [categorias, catFiltro]);

  /* ─── Parcelas: Dar Baixa ─── */
  const handleDarBaixa = async (parcelaId: string) => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      await axios.put(`/api/parcelas/${parcelaId}`, {
        status: 'pago',
        data_pagamento: hoje,
      });
      // Atualiza localmente sem re-fetch completo
      setParcelas(prev => prev.map(p =>
        p.id === parcelaId ? { ...p, status: 'pago', data_pagamento: hoje } : p
      ));
      showMsg('Baixa registrada! Lançamento financeiro criado automaticamente.');
    } catch {
      showMsg('Erro ao registrar baixa', 'error');
    } finally {
      setConfirmBaixaId(null);
    }
  };

  const handleImprimirRecibo = async (parcelaId: string) => {
    try {
      const res = await fetch(`/api/financeiro/parcelas/${parcelaId}/recibo`);
      if (!res.ok) throw new Error('Falha ao gerar recibo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      showMsg('Erro ao gerar recibo PDF', 'error');
    }
  };


  const handleOpenLancForm = (l?: Lancamento) => {
    if (l) {
      setLancForm({ data: l.data, tipo: l.tipo, categoria: l.categoria, valor: l.valor, descricao: l.descricao });
      setLancEditingId(l.id);
    } else {
      setLancForm(lancamentoVazio);
      setLancEditingId(null);
    }
    setOpenLancForm(true);
  };

  const handleSaveLanc = async () => {
    if (!lancForm.data || !lancForm.tipo || !lancForm.categoria || lancForm.valor === '' || Number(lancForm.valor) <= 0) {
      showMsg('Preencha todos os campos obrigatórios', 'error'); return;
    }
    const payload = { ...lancForm, valor: Number(lancForm.valor) };
    try {
      if (lancEditingId) {
        await axios.put(`/api/financeiro/${lancEditingId}`, payload);
        showMsg('Lançamento atualizado');
      } else {
        await axios.post('/api/financeiro', payload);
        showMsg('Lançamento adicionado');
      }
      setOpenLancForm(false);
      fetchLancamentos();
    } catch { showMsg('Erro ao salvar lançamento', 'error'); }
  };

  const handleDeleteLanc = async () => {
    if (!lancParaDeletar) return;
    try {
      await axios.delete(`/api/financeiro/${lancParaDeletar}`);
      showMsg('Lançamento excluído');
      fetchLancamentos();
    } catch { showMsg('Erro ao excluir', 'error'); }
    setOpenLancDelete(false);
    setLancParaDeletar(null);
  };

  /* ─── CRUD Categorias ─── */
  const handleOpenCatForm = (c?: Categoria) => {
    if (c) { setCatForm({ nome: c.nome, tipo: c.tipo }); setCatEditingId(c.id); }
    else { setCatForm(categoriaVazia); setCatEditingId(null); }
    setOpenCatForm(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.nome.trim()) { showMsg('Informe o nome da categoria', 'error'); return; }
    try {
      if (catEditingId) {
        await axios.put(`/api/categorias_financeiro/${catEditingId}`, catForm);
        showMsg('Categoria atualizada');
      } else {
        await axios.post('/api/categorias_financeiro', catForm);
        showMsg('Categoria adicionada');
      }
      setOpenCatForm(false);
      fetchCategorias();
    } catch { showMsg('Erro ao salvar categoria', 'error'); }
  };

  const handleDeleteCat = async () => {
    if (!catParaDeletar) return;
    try {
      await axios.delete(`/api/categorias_financeiro/${catParaDeletar}`);
      showMsg('Categoria excluída');
      fetchCategorias();
    } catch { showMsg('Erro ao excluir', 'error'); }
    setOpenCatDelete(false);
    setCatParaDeletar(null);
  };

  /* ─── Helpers ─── */
  const tipoChip = (tipo: string) => (
    <Chip
      label={tipo}
      size="small"
      sx={{
        backgroundColor: tipo === 'Entrada' ? '#e8f5e9' : tipo === 'Saída' ? '#fce4ec' : '#e3f2fd',
        color: tipo === 'Entrada' ? '#2e7d32' : tipo === 'Saída' ? '#c62828' : '#1565c0',
        fontWeight: 600, fontSize: 11
      }}
    />
  );

  const lancSortLabel = (campo: keyof Lancamento, label: string) => (
    <TableSortLabel
      active={lancOrdenacao.campo === campo}
      direction={lancOrdenacao.campo === campo ? lancOrdenacao.direcao : 'asc'}
      onClick={() => setLancOrdenacao(prev => ({
        campo,
        direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
      }))}
    >{label}</TableSortLabel>
  );

  /* ─── Totais ─── */
  const totalEntradas = lancFiltrados.filter(l => l.tipo === 'Entrada').reduce((s, l) => s + l.valor, 0);
  const totalSaidas = lancFiltrados.filter(l => l.tipo === 'Saída').reduce((s, l) => s + l.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  /* ═══ Render ═══ */
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} gutterBottom fontWeight="bold">
        {t('financeiro_titulo')}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Lançamentos" />
          <Tab label="Tipos de Despesa / Categoria" />
          <Tab label="Parcelas de Financiamento" />
        </Tabs>
      </Box>

      {/* ══════════ TAB 0 — LANÇAMENTOS ══════════ */}
      <TabPanel value={tab} index={0}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ px: 2, py: 1, borderRadius: 1, backgroundColor: '#e8f5e9', textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Entradas</Typography>
              <Typography fontWeight="bold" color="success.main">{formatCurrency(totalEntradas)}</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1, borderRadius: 1, backgroundColor: '#fce4ec', textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Saídas</Typography>
              <Typography fontWeight="bold" color="error.main">{formatCurrency(totalSaidas)}</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1, borderRadius: 1, backgroundColor: saldo >= 0 ? '#e3f2fd' : '#fff3e0', textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Saldo</Typography>
              <Typography fontWeight="bold" color={saldo >= 0 ? 'primary' : 'warning.main'}>{formatCurrency(saldo)}</Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenLancForm()}
            sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {t('novoLancamento')}
          </Button>
        </Box>

        {/* Busca */}
        <Box sx={{ mb: 2 }}>
          <TextField fullWidth variant="outlined" placeholder={`${t('buscarPlaceholder')} ${t('categoria').toLowerCase()}, ${t('tipo').toLowerCase()}, ${t('descricao').toLowerCase()}`}
            value={lancFiltro} onChange={e => setLancFiltro(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        </Box>

        {lancLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{lancSortLabel('data', 'Data')}</TableCell>
                  <TableCell>{lancSortLabel('tipo', 'Tipo')}</TableCell>
                  <TableCell>{lancSortLabel('categoria', 'Categoria')}</TableCell>
                  <TableCell>{lancSortLabel('descricao', 'Descrição')}</TableCell>
                  <TableCell align="right">{lancSortLabel('valor', 'Valor')}</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lancFiltrados.length > 0 ? lancFiltrados.map(l => (
                  <TableRow key={l.id} onClick={() => handleOpenLancForm(l)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(25,118,210,0.06)' } }}>
                    <TableCell>{l.data}</TableCell>
                    <TableCell>{tipoChip(l.tipo)}</TableCell>
                    <TableCell>{l.categoria}</TableCell>
                    <TableCell>{l.descricao}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: l.tipo === 'Entrada' ? 'success.main' : 'error.main' }}>
                      {l.tipo === 'Saída' ? '−' : '+'}{formatCurrency(l.valor)}
                    </TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <IconButton size="small" color="primary" onClick={() => handleOpenLancForm(l)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => { setLancParaDeletar(l.id); setOpenLancDelete(true); }}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">{t('nenhumRegistro')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ══════════ TAB 1 — CATEGORIAS ══════════ */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Typography variant="h6">Tipos de Despesa / Categoria</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCatForm()}
            sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {t('novaCategoria')}
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField fullWidth variant="outlined" placeholder={`${t('buscarPlaceholder')} ${t('categoria').toLowerCase()}`}
            value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        </Box>

        {catLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} elevation={3}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>Tipo</strong></TableCell>
                  <TableCell align="center"><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {catFiltradas.length > 0 ? catFiltradas.map(c => (
                  <TableRow key={c.id} onClick={() => handleOpenCatForm(c)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(25,118,210,0.06)' } }}>
                    <TableCell>{c.nome}</TableCell>
                    <TableCell>{tipoChip(c.tipo)}</TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <IconButton size="small" color="primary" onClick={() => handleOpenCatForm(c)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => { setCatParaDeletar(c.id); setOpenCatDelete(true); }}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">{t('nenhumRegistro')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ══ Dialog — Lançamento ══ */}
      <Dialog open={openLancForm} onClose={() => setOpenLancForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{lancEditingId ? `${t('editar')} Lançamento` : t('novoLancamento')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Data" type="date" fullWidth
            value={lancForm.data}
            onChange={e => setLancForm(p => ({ ...p, data: e.target.value }))}
            InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={lancForm.tipo}
              onChange={e => setLancForm(p => ({ ...p, tipo: e.target.value, categoria: '' }))}>
              <MenuItem value="Entrada">Entrada</MenuItem>
              <MenuItem value="Saída">Saída</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Categoria</InputLabel>
            <Select label="Categoria" value={lancForm.categoria}
              onChange={e => setLancForm(p => ({ ...p, categoria: e.target.value }))}>
              {categorias
                .filter(c => c.tipo === lancForm.tipo || c.tipo === 'Ambos')
                .map(c => <MenuItem key={c.id} value={c.nome}>{c.nome}</MenuItem>)}
              {categorias.filter(c => c.tipo === lancForm.tipo || c.tipo === 'Ambos').length === 0 && (
                <MenuItem disabled value="">Nenhuma categoria para este tipo</MenuItem>
              )}
            </Select>
          </FormControl>
          <TextField label="Valor" type="number" fullWidth
            value={lancForm.valor}
            onChange={e => setLancForm(p => ({ ...p, valor: e.target.value === '' ? '' : Number(e.target.value) }))}
            inputProps={{ min: 0 }} />
          <TextField label="Descrição" fullWidth multiline rows={2}
            value={lancForm.descricao}
            onChange={e => setLancForm(p => ({ ...p, descricao: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLancForm(false)} color="inherit">{t('cancelar')}</Button>
          <Button onClick={handleSaveLanc} variant="contained">{t('salvar')}</Button>
        </DialogActions>
      </Dialog>

      {/* ══ Dialog — Confirmar Exclusão Lançamento ══ */}
      <Dialog open={openLancDelete} onClose={() => setOpenLancDelete(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent><Typography>Excluir este lançamento? Esta ação não pode ser desfeita.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLancDelete(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleDeleteLanc} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>

      {/* ══ Dialog — Categoria ══ */}
      <Dialog open={openCatForm} onClose={() => setOpenCatForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{catEditingId ? `${t('editar')} ${t('categoria')}` : t('novaCategoria')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Nome da Categoria" fullWidth
            value={catForm.nome}
            onChange={e => setCatForm(p => ({ ...p, nome: e.target.value }))} />
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={catForm.tipo}
              onChange={e => setCatForm(p => ({ ...p, tipo: e.target.value }))}>
              <MenuItem value="Entrada">Entrada</MenuItem>
              <MenuItem value="Saída">Saída</MenuItem>
              <MenuItem value="Ambos">Ambos</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCatForm(false)} color="inherit">{t('cancelar')}</Button>
          <Button onClick={handleSaveCat} variant="contained">{t('salvar')}</Button>
        </DialogActions>
      </Dialog>

      {/* ══ Dialog — Confirmar Exclusão Categoria ══ */}
      <Dialog open={openCatDelete} onClose={() => setOpenCatDelete(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent><Typography>Excluir esta categoria? Os lançamentos existentes não serão alterados.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCatDelete(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleDeleteCat} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>

      {/* ══════════ TAB 2 — PARCELAS A VENCER ══════════ */}
      <TabPanel value={tab} index={2}>
        {/* Header: título + seletor de mês + filtro de texto */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6">Parcelas a Vencer</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Seletor de Mês/Ano */}
            <TextField
              size="small"
              type="month"
              label="Mês de Referência"
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            {/* Filtro de texto */}
            <TextField
              size="small"
              placeholder="Buscar por cliente ou status..."
              value={parcelaFiltro}
              onChange={e => setParcelaFiltro(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ minWidth: 240 }}
            />
          </Box>
        </Box>

        {/* Totalizadores do mês */}
        {(() => {
          const filtradas = parcelas.filter(p =>
            !parcelaFiltro ||
            p.cliente_nome?.toLowerCase().includes(parcelaFiltro.toLowerCase()) ||
            p.status?.toLowerCase().includes(parcelaFiltro.toLowerCase())
          );
          const totalPago     = filtradas.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0);
          const totalPendente = filtradas.filter(p => p.status !== 'pago').reduce((s, p) => s + Number(p.valor), 0);
          return (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ px: 2, py: 1, borderRadius: 1, backgroundColor: '#e8f5e9', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">✓ Recebido no mês</Typography>
                <Typography fontWeight="bold" color="success.main">{formatCurrency(totalPago)}</Typography>
              </Box>
              <Box sx={{ px: 2, py: 1, borderRadius: 1, backgroundColor: '#fff3e0', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">⏳ Pendente no mês</Typography>
                <Typography fontWeight="bold" color="warning.main">{formatCurrency(totalPendente)}</Typography>
              </Box>
              <Box sx={{ px: 2, py: 1, borderRadius: 1, backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Total de parcelas</Typography>
                <Typography fontWeight="bold">{filtradas.length}</Typography>
              </Box>
            </Box>
          );
        })()}

        {parcelasLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1a237e' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Cliente</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Parcela</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">Valor</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Vencimento</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Status</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Pagamento</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const filtradas = parcelas.filter(p =>
                    !parcelaFiltro ||
                    p.cliente_nome?.toLowerCase().includes(parcelaFiltro.toLowerCase()) ||
                    p.status?.toLowerCase().includes(parcelaFiltro.toLowerCase())
                  );
                  if (filtradas.length === 0) return (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          Nenhuma parcela encontrada para {mesSelecionado}.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                  return filtradas.map(p => (
                    <TableRow key={p.id} hover sx={{ backgroundColor: p.status === 'pago' ? '#f1f8e9' : 'inherit' }}>
                      <TableCell>{p.cliente_nome || '—'}</TableCell>
                      <TableCell align="center">{p.numero_parcela}</TableCell>
                      <TableCell align="right">{formatCurrency(p.valor)}</TableCell>
                      <TableCell align="center">
                        {p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={p.status === 'pago' ? 'Pago' : 'Pendente'}
                          color={p.status === 'pago' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {p.status !== 'pago' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => setConfirmBaixaId(p.id)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                          >
                            Dar Baixa
                          </Button>
                        )}
                        {p.status === 'pago' && (
                          <Chip label="✓ Quitado" color="success" variant="outlined" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ══ Dialog — Confirmar Dar Baixa ══ */}
      <Dialog open={!!confirmBaixaId} onClose={() => setConfirmBaixaId(null)}>
        <DialogTitle>Confirmar Baixa</DialogTitle>
        <DialogContent>
          <Typography>Confirmar o pagamento desta parcela? A data de pagamento será registrada como hoje.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBaixaId(null)} color="inherit">Cancelar</Button>
          <Button
            onClick={() => confirmBaixaId && handleDarBaixa(confirmBaixaId)}
            color="success"
            variant="contained"
            startIcon={<CheckCircleIcon />}
          >
            Confirmar Baixa
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Snackbar ══ */}
      <Snackbar open={snackbar.open} autoHideDuration={5000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Financeiro;
