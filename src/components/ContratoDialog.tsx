import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Alert, CircularProgress,
  Grid, Paper, FormControl, InputLabel, Select, MenuItem,
  Checkbox, Chip, Stack, TextField,
  LinearProgress
} from '@mui/material';
import { Download, FileText } from 'lucide-react';
import axios from 'axios';
import { DadosContratoCompleto, ServicoContrato } from '../types/vendas';
import {
  gerarContratosMultiplos, IdiomaContrato,
  baixarPDF, converterParaBase64
} from '../utils/gerarContratoPDF';
import { formatarMoeda, formatarDataBR } from '../utils/vendas';
import HirataLogo from '../assets/Hirata Logo.svg';

interface Configuracao {
  id?: string;
  nomeEmpresa?: string;
  endereco?: string;
  telefone?: string;
  numeroAutorizacao?: string;
}

interface OrdemServico {
  id: string;
  veiculoId?: string;
  clienteId?: string;
  descricao?: string;
  servicos?: Array<{ nome: string; valor: number }>;
  valor?: number;
  data?: string;
  dataFim?: string;
  status?: string;
}

interface ContratoDialogProps {
  open: boolean;
  onClose: () => void;
  dados: DadosContratoCompleto | null;
  onSalvar?: (nomeArquivo: string, base64?: string) => Promise<void>;
  carregando?: boolean;
  veiculoId?: string;
}

const IDIOMAS_OPCAO: Array<{ value: IdiomaContrato; label: string }> = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'fil', label: '🇵🇭 Filipino' },
  { value: 'vi', label: '🇻🇳 Tiếng Việt' },
];

export const ContratoDialog: React.FC<ContratoDialogProps> = ({
  open, onClose, dados, onSalvar, carregando = false, veiculoId
}) => {
  const [terceiroIdioma, setTerceiroIdioma] = useState<IdiomaContrato | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuracao>({});
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoContrato[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(false);

  useEffect(() => {
    if (open) {
      setObservacoes('');
      carregarDados();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, veiculoId]);

  const carregarDados = async () => {
    setCarregandoDados(true);
    try {
      const [configRes, ordensRes] = await Promise.all([
        axios.get('http://localhost:3001/configuracoes').catch(() => ({ data: [] })),
        axios.get('http://localhost:3001/ordens_servico').catch(() => ({ data: [] })),
      ]);
      if (configRes.data.length > 0) setConfig(configRes.data[0]);

      let todasOrdens: OrdemServico[] = ordensRes.data;
      if (veiculoId) {
        todasOrdens = todasOrdens.filter((o: OrdemServico) => o.veiculoId === veiculoId);
      }
      setOrdens(todasOrdens.filter((o: OrdemServico) =>
        o.status === 'concluido' || o.status === 'finalizado' || o.status === 'Concluído'
      ));
    } catch (e) {
      console.error('Erro ao carregar dados do contrato:', e);
    } finally {
      setCarregandoDados(false);
    }
  };

  const handleGerarPDFs = async () => {
    if (!dados) return;

    try {
      setGerando(true);
      setErro(null);
      setProgresso(10);

      const dadosCompletos: DadosContratoCompleto = {
        ...dados,
        logoUrl: HirataLogo,
        nomeEmpresa: config.nomeEmpresa,
        enderecoEmpresa: config.endereco,
        telefoneEmpresa: config.telefone,
        vendedor: config.nomeEmpresa || 'Vendedor',
        servicosRealizados: servicosSelecionados,
        observacoes: observacoes || undefined,
      };

      setProgresso(20);

      const pdfs = await gerarContratosMultiplos(
        dadosCompletos,
        terceiroIdioma as IdiomaContrato || undefined
      );

      setProgresso(80);

      for (const pdf of pdfs) {
        if (onSalvar) {
          const base64 = await converterParaBase64(pdf.blob);
          await onSalvar(pdf.nome, base64);
        }
        baixarPDF(pdf.blob, pdf.nome);
        await new Promise(r => setTimeout(r, 500));
      }

      setProgresso(100);
      setTimeout(onClose, 1500);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao gerar PDFs';
      setErro(mensagem);
      console.error('Erro:', err);
    } finally {
      setGerando(false);
      setProgresso(0);
    }
  };

  const toggleServico = (ordem: OrdemServico) => {
    const servico: ServicoContrato = {
      id: ordem.id,
      descricao: ordem.descricao || `Ordem de Serviço #${ordem.id}`,
      valor: ordem.valor || 0,
      data: ordem.data || ordem.dataFim
    };
    setServicosSelecionados(prev => {
      const existe = prev.find(s => s.id === servico.id);
      return existe ? prev.filter(s => s.id !== servico.id) : [...prev, servico];
    });
  };

  if (!dados) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText size={24} style={{ color: '#1976d2' }} />
          <Typography variant="h6">Gerar Contrato de Venda</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        {carregandoDados && <LinearProgress sx={{ mb: 2 }} />}

        <Stack spacing={2.5}>
          {erro && <Alert severity="error">{erro}</Alert>}

          {/* Idiomas automáticos */}
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              📄 PDFs Gerados Automaticamente
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="🇧🇷 Português" color="primary" size="small" />
              <Chip label="🇯🇵 日本語 (Japonês)" color="primary" size="small" />
            </Box>
          </Paper>

          {/* Observações */}
          <TextField
            label="📝 Observações / Termos adicionais (opcional)"
            multiline
            rows={3}
            fullWidth
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Digite termos extras, condições especiais, observações..."
            sx={{ mb: 2 }}
          />

          {/* Terceiro idioma */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              🌐 3° Idioma (Opcional)
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Selecione um 3° idioma</InputLabel>
              <Select
                value={terceiroIdioma}
                label="Selecione um 3° idioma"
                onChange={e => setTerceiroIdioma(e.target.value as IdiomaContrato | '')}
                disabled={gerando}
              >
                <MenuItem value=""><em>Nenhum</em></MenuItem>
                {IDIOMAS_OPCAO.map(op => (
                  <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {terceiroIdioma && (
              <Box sx={{ mt: 1, p: 1.5, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                  ✓ PDF adicional será gerado em: {IDIOMAS_OPCAO.find(o => o.value === terceiroIdioma)?.label}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Serviços realizados */}
          {ordens.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                🔧 Serviços/Manutenções para incluir no Contrato
              </Typography>
              <Paper sx={{ border: '1px solid #e0e0e0', maxHeight: 180, overflow: 'auto' }}>
                {ordens.map(ordem => (
                  <Box
                    key={ordem.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
                      borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                    onClick={() => toggleServico(ordem)}
                  >
                    <Checkbox
                      size="small"
                      checked={servicosSelecionados.some(s => s.id === ordem.id)}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {ordem.descricao || `OS #${ordem.id}`}
                      </Typography>
                      {ordem.data && (
                        <Typography variant="caption" color="text.secondary">
                          {formatarDataBR(ordem.data)}
                        </Typography>
                      )}
                    </Box>
                    {ordem.valor ? (
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                        {formatarMoeda(ordem.valor)}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Paper>
            </Box>
          )}

          {/* Dados da empresa (preview) */}
          <Paper sx={{ p: 2, bgcolor: '#f9f9f9', border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              🏢 Dados da Empresa (do Cadastro)
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" fontWeight={500}>Empresa:</Typography>
                  <Typography variant="caption">{config.nomeEmpresa || '—'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" fontWeight={500}>Endereço:</Typography>
                  <Typography variant="caption">{config.endereco || '—'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" fontWeight={500}>Telefone:</Typography>
                  <Typography variant="caption">{config.telefone || '—'}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Resumo do contrato */}
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderLeft: '4px solid #1976d2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Dados do Contrato:</Typography>
            <Grid container spacing={1} sx={{ fontSize: '0.9rem' }}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={500}>Comprador:</Typography>
                  <Typography variant="body2">{dados.nomeComprador}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={500}>Placa:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{dados.placa}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={500}>Valor Total:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>{formatarMoeda(dados.valor)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={500}>Parcelas:</Typography>
                  <Typography variant="body2">{dados.parcelas.length}x</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {gerando && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>Gerando PDFs... {progresso}%</Typography>
              <LinearProgress variant="determinate" value={progresso} />
            </Box>
          )}

          <Alert severity="info">
            📋 Serão gerados automaticamente: <strong>Português</strong> + <strong>Japonês</strong>
            {terceiroIdioma && ` + ${IDIOMAS_OPCAO.find(o => o.value === terceiroIdioma)?.label}`}.
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={gerando || carregando} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={handleGerarPDFs}
          disabled={gerando || carregando}
          variant="contained"
          startIcon={gerando ? <CircularProgress size={20} /> : <Download size={20} />}
        >
          {gerando ? 'Gerando...' : `Gerar ${terceiroIdioma ? '3 PDFs' : '2 PDFs'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContratoDialog;
