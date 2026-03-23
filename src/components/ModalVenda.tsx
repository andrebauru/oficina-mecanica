import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Checkbox,
  ListItemText
} from '@mui/material';
import { Plus } from 'lucide-react';
import axios from 'axios';
import { Cliente, Veiculo, Venda, Parcela } from '../types/vendas';
import Paper from '@mui/material/Paper';
import HirataLogo from '../assets/Hirata Logo.svg';
import {
  calcularParcelamento,
  calcularVendaVista,
  formatarMoeda,
  formatarDataBR
} from '../utils/vendas';
import { baixarReciboVendaPDF, gerarReciboVendaImagem, gerarReciboVendaPDF } from '../utils/gerarReciboVendaPDF';
import { sanitizeMultilineText, sanitizeNumber, sanitizeText } from '../utils/security';

const API_URL = '/api';

interface Configuracao {
  nomeEmpresa?: string;
  endereco?: string;
  telefone?: string;
  numeroAutorizacao?: string;
}

interface ModalVendaProps {
  open?: boolean;
  onClose?: () => void;
  onVendaCriada?: () => void;
}

interface Servico {
  id: string;
  nome: string;
  valor: number;
  descricao?: string;
}

interface Peca {
  id: string;
  nome: string;
  preco: number;
  codigo?: string;
  quantidade?: number;
}

interface DadosVenda {
  clienteId: string;
  veiculoId: string;
  tipoVenda: 'vista' | 'parcelado';
  numeroParcelas: number;
  valorTotal: number;
  valorPago: number;
  juros: number;
  servicosIds: string[];
  pecasIds: string[];
  observacoes?: string;
}

const ModalVenda: React.FC<ModalVendaProps> = ({ 
  open = true, 
  onClose = () => {}, 
  onVendaCriada = () => {} 
}) => {
  // Estados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuracao>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dadosCliente, setDadosCliente] = useState<any>(null);

  // Dados do formulário
  const [dadosVenda, setDadosVenda] = useState<DadosVenda>({
    clienteId: '',
    veiculoId: '',
    tipoVenda: 'parcelado',
    numeroParcelas: 12,
    valorTotal: 1000000,
    valorPago: 0,
    juros: 14.6,
    servicosIds: [],
    pecasIds: [],
    observacoes: ''
  });

  // Preview
  const [previewParcelas, setPreviewParcelas] = useState<any[]>([]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [clientesRes, veiculosRes, servicosRes, pecasRes, configRes] = await Promise.all([
        axios.get(`${API_URL}/clientes`),
        axios.get(`${API_URL}/veiculos`),
        axios.get(`${API_URL}/servicos`),
        axios.get(`${API_URL}/pecas`),
        axios.get(`${API_URL}/configuracoes`).catch(() => ({ data: [] }))
      ]);

      setClientes(clientesRes.data);
      setVeiculos(veiculosRes.data);
      setServicos(servicosRes.data);
      setPecas(pecasRes.data);
      setConfig(configRes.data?.[0] || {});
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setErro(mensagem);
      console.error('Erro:', err);
    } finally {
      setCarregando(false);
    }
  };

  // Atualizar preview de parcelas
  useEffect(() => {
    if (dadosVenda.tipoVenda === 'vista') {
      const parcelas = calcularVendaVista(dadosVenda.valorTotal);
      setPreviewParcelas(parcelas);
    } else {
      const resultado = calcularParcelamento(
        dadosVenda.valorTotal,
        dadosVenda.numeroParcelas,
        dadosVenda.juros
      );
      setPreviewParcelas(resultado.parcelas);
    }
  }, [dadosVenda]);

  useEffect(() => {
    if (dadosVenda.tipoVenda === 'vista') {
      setDadosVenda(prev => {
        if (prev.numeroParcelas === 1 && prev.juros === 0 && prev.valorPago === prev.valorTotal) return prev;
        return { ...prev, numeroParcelas: 1, juros: 0, valorPago: prev.valorTotal };
      });
      return;
    }

    setDadosVenda(prev => {
      if (prev.juros === 0) {
        return { ...prev, juros: 14.6 };
      }
      return prev;
    });
  }, [dadosVenda.tipoVenda]);

  // Atualizar dados do cliente quando clienteId muda
  useEffect(() => {
    if (dadosVenda.clienteId) {
      const cliente = clientes.find(c => c.id === dadosVenda.clienteId);
      setDadosCliente(cliente || null);
    } else {
      setDadosCliente(null);
    }
  }, [dadosVenda.clienteId, clientes]);

  // Validar formulário
  const validar = (): boolean => {
    if (!dadosVenda.clienteId) {
      setErro('Selecione um cliente');
      return false;
    }
    if (!dadosVenda.veiculoId) {
      setErro('Selecione um veículo');
      return false;
    }
    if (dadosVenda.valorTotal <= 0) {
      setErro('Valor total deve ser maior que zero');
      return false;
    }
    if (dadosVenda.valorPago < 0) {
      setErro('Valor pago não pode ser negativo');
      return false;
    }
    if (dadosVenda.tipoVenda === 'parcelado' && dadosVenda.numeroParcelas <= 0) {
      setErro('Número de parcelas deve ser maior que zero');
      return false;
    }
    return true;
  };

  // Criar venda
  const handleCriarVenda = async () => {
    if (!validar()) return;

    try {
      setCriando(true);
      setErro(null);

      // Buscar dados do cliente e veículo
      const cliente = clientes.find(c => c.id === dadosVenda.clienteId);
      const veiculo = veiculos.find(v => v.id === dadosVenda.veiculoId);

      if (!cliente || !veiculo) {
        setErro('Dados incompletos');
        return;
      }

      // Gerar ID da venda
      const vendaId = `v${Date.now()}`;

      // Calcular valor total incluindo serviços e peças selecionados
      const valorServicos = dadosVenda.servicosIds.reduce((sum, id) => {
        const s = servicos.find(sv => sv.id === id);
        return sum + (s?.valor || 0);
      }, 0);
      const valorPecas = dadosVenda.pecasIds.reduce((sum, id) => {
        const p = pecas.find(pc => pc.id === id);
        return sum + (p?.preco || 0);
      }, 0);
      const valorTotalComItens = dadosVenda.valorTotal + valorServicos + valorPecas;
      const valorPago = sanitizeNumber(dadosVenda.valorPago, { min: 0, max: valorTotalComItens });
      const observacoes = sanitizeMultilineText(dadosVenda.observacoes || '', 500);

      // Criar venda
      const novaVenda: Venda = {
        id: vendaId,
        clienteId: dadosVenda.clienteId,
        veiculoId: dadosVenda.veiculoId,
        clienteNomeSnapshot: sanitizeText(cliente.nome, 100),
        clienteTelefoneSnapshot: sanitizeText(cliente.telefone || '', 40),
        clienteEnderecoSnapshot: sanitizeMultilineText(cliente.endereco || '', 250),
        dataVenda: new Date().toISOString(),
        valorTotal: valorTotalComItens,
        valorPago,
        tipoVenda: dadosVenda.tipoVenda,
        numeroParcelas: dadosVenda.numeroParcelas,
        juros: dadosVenda.juros,
        statusVenda: dadosVenda.tipoVenda === 'vista' ? 'quitado' : 'ativo',
        foroPagamento: 'Tsu',
        placa: veiculo.placa,
        chassi: veiculo.chassi || '',
        observacoes
      };

      // Calcular parcelas
      const resultadoCalc = dadosVenda.tipoVenda === 'vista'
        ? calcularVendaVista(valorTotalComItens)
        : calcularParcelamento(
            valorTotalComItens,
            dadosVenda.numeroParcelas,
            dadosVenda.juros,
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          );

      // Extrair parcelas (tanto para array direto quanto para objeto com propriedade parcelas)
      const parcelasCalculadas = Array.isArray(resultadoCalc) ? resultadoCalc : resultadoCalc.parcelas;

      // Criar parcelas
      const parcelas: Parcela[] = parcelasCalculadas.map((p, idx) => ({
        id: `p${vendaId}-${String(idx + 1).padStart(2, '0')}`,
        vendaId,
        numeroParcela: p.numero,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        status: dadosVenda.tipoVenda === 'vista' ? 'pago' : 'pendente',
        dataPagamento: dadosVenda.tipoVenda === 'vista' ? new Date().toISOString().split('T')[0] : undefined,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone
      }));

      // Salvar venda
      await axios.post(`${API_URL}/vendas`, novaVenda);

      // Salvar parcelas
      for (const parcela of parcelas) {
        await axios.post(`${API_URL}/parcelas`, parcela);
      }

      try {
        const reciboDados = {
          logoUrl: HirataLogo,
          nomeEmpresa: config.nomeEmpresa,
          enderecoEmpresa: config.endereco,
          telefoneEmpresa: config.telefone,
          numeroAutorizacao: config.numeroAutorizacao,
          clienteNome: cliente.nome,
          clienteTelefone: cliente.telefone,
          clienteEndereco: cliente.endereco,
          numeroVenda: vendaId,
          dataVenda: novaVenda.dataVenda,
          descricaoVeiculo: `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`,
          placa: veiculo.placa,
          chassi: veiculo.chassi,
          tipoVenda: dadosVenda.tipoVenda,
          valorTotal: valorTotalComItens,
          valorPago,
          observacoes,
        };

        const reciboBlob = await gerarReciboVendaPDF(reciboDados);
        const reciboImagem = await gerarReciboVendaImagem(reciboDados);

        const reciboPDF = baixarReciboVendaPDF(reciboBlob, vendaId, cliente.nome);
        await axios.patch(`${API_URL}/vendas/${vendaId}`, {
          reciboPDF,
          reciboGeradoEm: new Date().toISOString(),
        }).catch(() => {});

        await axios.post('/api/documentos', {
          entityId: cliente.id,
          entityType: 'cliente',
          base64: reciboImagem,
          filename: reciboPDF.replace('.pdf', '.jpg'),
          anotacao: `Recibo da venda ${vendaId} • Valor pago: ${formatarMoeda(valorPago)}`,
          dataUpload: new Date().toISOString(),
          categoria: 'recibo_venda',
          referenciaId: vendaId,
          referenciaTipo: 'venda',
          arquivoOriginal: reciboPDF,
        }).catch(() => {});
      } catch (pdfError) {
        console.error('Erro ao gerar recibo da venda:', pdfError);
      }

      onVendaCriada();
      onClose();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao criar venda';
      setErro(mensagem);
      console.error('Erro:', err);
    } finally {
      setCriando(false);
    }
  };

  // Filtra veículos pelo cliente
  const veiculosDoCliente = veiculos.filter(v => v.clienteId === dadosVenda.clienteId);

  // Calcula resumo
  const resultadoCalc = dadosVenda.tipoVenda === 'vista'
    ? { parcelas: calcularVendaVista(dadosVenda.valorTotal), valorJuros: 0, valorTotalComJuros: dadosVenda.valorTotal }
    : calcularParcelamento(dadosVenda.valorTotal, dadosVenda.numeroParcelas, dadosVenda.juros);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Plus size={24} style={{ color: '#1976d2' }} />
          <Typography variant="h6">Nova Venda de Veículo</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        {carregando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Alertas */}
            {erro && <Alert severity="error">{erro}</Alert>}

            {/* Seção 1: Cliente e Veículo */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                📋 Dados Básicos
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Cliente</InputLabel>
                    <Select
                      value={dadosVenda.clienteId}
                      label="Cliente"
                      onChange={(e) => setDadosVenda({ ...dadosVenda, clienteId: e.target.value, veiculoId: '' })}
                      disabled={criando}
                    >
                      <MenuItem value="">Selecione um cliente</MenuItem>
                      {clientes.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!dadosVenda.clienteId}>
                    <InputLabel>Veículo</InputLabel>
                    <Select
                      value={dadosVenda.veiculoId}
                      label="Veículo"
                      onChange={(e) => setDadosVenda({ ...dadosVenda, veiculoId: e.target.value })}
                      disabled={criando || veiculosDoCliente.length === 0}
                    >
                      <MenuItem value="">Selecione um veículo</MenuItem>
                      {veiculosDoCliente.map(v => (
                        <MenuItem key={v.id} value={v.id}>
                          {v.marca} {v.modelo} ({v.placa})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Dados do cliente selecionado */}
            {dadosCliente && (
              <Paper sx={{ p: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2e7d32' }}>
                  👤 Dados do Cliente Selecionado
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Nome</Typography>
                    <Typography variant="body2" fontWeight={500}>{dadosCliente.nome}</Typography>
                  </Grid>
                  {dadosCliente.telefone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Telefone</Typography>
                      <Typography variant="body2">{dadosCliente.telefone}</Typography>
                    </Grid>
                  )}
                  {dadosCliente.email && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography variant="body2">{dadosCliente.email}</Typography>
                    </Grid>
                  )}
                  {dadosCliente.endereco && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Endereço</Typography>
                      <Typography variant="body2">{dadosCliente.endereco}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Seção 2: Tipo de Venda */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                💳 Tipo de Venda
              </Typography>
              <RadioGroup
                row
                value={dadosVenda.tipoVenda}
                onChange={(e) => setDadosVenda({
                  ...dadosVenda,
                  tipoVenda: e.target.value as 'vista' | 'parcelado',
                  numeroParcelas: e.target.value === 'vista' ? 1 : 12
                })}
              >
                <FormControlLabel
                  value="vista"
                  control={<Radio />}
                  label="À Vista (Sem juros)"
                  sx={{
                    border: dadosVenda.tipoVenda === 'vista' ? '1px solid #1976d2' : '1px solid #e0e0e0',
                    borderRadius: 1,
                    px: 2,
                    py: 1,
                    mr: 1
                  }}
                />
                <FormControlLabel
                  value="parcelado"
                  control={<Radio />}
                  label="Parcelado (Com juros)"
                  sx={{
                    border: dadosVenda.tipoVenda === 'parcelado' ? '1px solid #1976d2' : '1px solid #e0e0e0',
                    borderRadius: 1,
                    px: 2,
                    py: 1
                  }}
                />
              </RadioGroup>
            </Box>

            {/* Seção 3: Valor e Parcelas */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                💰 Valores
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor Total (R$)"
                    type="number"
                    value={dadosVenda.valorTotal}
                    onChange={(e) => setDadosVenda({ 
                      ...dadosVenda, 
                      valorTotal: parseFloat(e.target.value) 
                    })}
                    disabled={criando}
                    inputProps={{ step: '1000', min: '0' }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor Pago no ato"
                    type="number"
                    value={dadosVenda.valorPago}
                    onChange={(e) => setDadosVenda({
                      ...dadosVenda,
                      valorPago: parseFloat(e.target.value || '0')
                    })}
                    disabled={criando}
                    inputProps={{ step: '1000', min: '0' }}
                    helperText="Esse valor será exibido no recibo PDF gerado automaticamente."
                  />
                </Grid>

                {dadosVenda.tipoVenda === 'parcelado' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Juros (%)"
                        type="number"
                        value={dadosVenda.juros}
                        onChange={(e) => setDadosVenda({ 
                          ...dadosVenda, 
                          juros: parseFloat(e.target.value) 
                        })}
                        disabled={criando}
                        inputProps={{ step: '0.1', min: '0' }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Número de Parcelas"
                        type="number"
                        value={dadosVenda.numeroParcelas}
                        onChange={(e) => setDadosVenda({ 
                          ...dadosVenda, 
                          numeroParcelas: parseInt(e.target.value) 
                        })}
                        disabled={criando}
                        inputProps={{ min: '1', max: '60' }}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>

            {/* Seção: Serviços e Peças */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                🔧 Serviços e Peças (Opcional)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Serviços</InputLabel>
                    <Select
                      multiple
                      value={dadosVenda.servicosIds}
                      label="Serviços"
                      onChange={(e) => setDadosVenda({ ...dadosVenda, servicosIds: e.target.value as string[] })}
                      disabled={criando}
                      renderValue={(selected) => 
                        (selected as string[]).map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean).join(', ')
                      }
                    >
                      {servicos.map(s => (
                        <MenuItem key={s.id} value={s.id}>
                          <Checkbox checked={dadosVenda.servicosIds.includes(s.id)} size="small" />
                          <ListItemText primary={s.nome} secondary={formatarMoeda(s.valor)} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Peças</InputLabel>
                    <Select
                      multiple
                      value={dadosVenda.pecasIds}
                      label="Peças"
                      onChange={(e) => setDadosVenda({ ...dadosVenda, pecasIds: e.target.value as string[] })}
                      disabled={criando}
                      renderValue={(selected) => 
                        (selected as string[]).map(id => pecas.find(p => p.id === id)?.nome).filter(Boolean).join(', ')
                      }
                    >
                      {pecas.filter(p => (p.quantidade ?? 1) > 0).map(p => (
                        <MenuItem key={p.id} value={p.id}>
                          <Checkbox checked={dadosVenda.pecasIds.includes(p.id)} size="small" />
                          <ListItemText primary={p.nome} secondary={formatarMoeda(p.preco)} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Seção: Observações */}
            <TextField
              label="📝 Observações (opcional)"
              multiline
              rows={2}
              fullWidth
              value={dadosVenda.observacoes || ''}
              onChange={(e) => setDadosVenda({ ...dadosVenda, observacoes: e.target.value })}
              placeholder="Termos adicionais, condições especiais..."
              disabled={criando}
            />

            {/* Seção 4: Preview */}
            <Card sx={{ bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  📊 Resumo
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Valor Original
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatarMoeda(dadosVenda.valorTotal)}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Juros
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc3545' }}>
                        {formatarMoeda(resultadoCalc.valorJuros)}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Total
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#28a745' }}>
                        {formatarMoeda(resultadoCalc.valorTotalComJuros)}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Valor Pago
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatarMoeda(dadosVenda.valorPago)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Ao salvar, o sistema gera um recibo PDF com logo, dados da empresa, dados do cliente, valor pago e espaço para carimbo/calibração.
                </Alert>

                {/* Tabela de parcelas */}
                {previewParcelas.length > 0 && (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Primeiras 3 parcelas:
                    </Typography>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #1976d2' }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Parc.</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>Valor</th>
                          <th style={{ textAlign: 'center', padding: '8px' }}>Vencimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewParcelas.slice(0, 3).map((p: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <td style={{ padding: '8px' }}>{p.numero}</td>
                            <td style={{ textAlign: 'right', padding: '8px', fontWeight: 500 }}>
                              {formatarMoeda(p.valor)}
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px', fontFamily: 'monospace' }}>
                              {formatarDataBR(p.dataVencimento)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewParcelas.length > 3 && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                        ... mais {previewParcelas.length - 3} parcelas
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose}
          disabled={criando || carregando}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleCriarVenda}
          disabled={criando || carregando || !dadosVenda.clienteId || !dadosVenda.veiculoId}
          variant="contained"
          startIcon={criando ? <CircularProgress size={20} /> : <Plus size={20} />}
        >
          {criando ? 'Criando...' : 'Criar Venda'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalVenda;
