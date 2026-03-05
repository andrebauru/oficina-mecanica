import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  FormControlLabel,
  RadioGroup,
  Radio,
  Box,
  Typography,
  Paper,
  Grid
} from '@mui/material';
import { Download, FileText } from 'lucide-react';
import { DadosContrato } from '../types/vendas';
import { 
  gerarContratoPDF, 
  baixarPDF, 
  gerarNomeArquivoContrato,
  converterParaBase64
} from '../utils/gerarContratoPDF';
import { formatarMoeda, formatarDataBR } from '../utils/vendas';

interface ContratoDialogProps {
  open: boolean;
  onClose: () => void;
  dados: DadosContrato | null;
  onSalvar?: (nomeArquivo: string, base64?: string) => Promise<void>;
  carregando?: boolean;
}

export const ContratoDialog: React.FC<ContratoDialogProps> = ({
  open,
  onClose,
  dados,
  onSalvar,
  carregando = false
}) => {
  const [idioma, setIdioma] = useState<'pt' | 'en'>('pt');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleGerarPDF = async () => {
    if (!dados) return;

    try {
      setGerando(true);
      setErro(null);

      // Gerar PDF
      const blob = gerarContratoPDF(dados, idioma);
      const nomeArquivo = gerarNomeArquivoContrato(dados.nomeComprador, dados.numeroVenda);

      // Se houver função de salvar, salvar no banco
      if (onSalvar) {
        const base64 = await converterParaBase64(blob);
        await onSalvar(nomeArquivo, base64);
      }

      // Download do PDF
      baixarPDF(blob, nomeArquivo);

      // Fechar após sucesso
      setTimeout(onClose, 1500);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao gerar PDF';
      setErro(mensagem);
      console.error('Erro ao gerar contrato:', err);
    } finally {
      setGerando(false);
    }
  };

  if (!dados) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText size={24} style={{ color: '#1976d2' }} />
          <Typography variant="h6">Gerar Contrato de Venda</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        {/* Seleção de Idioma */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Selecione o Idioma:
          </Typography>
          <RadioGroup
            row
            value={idioma}
            onChange={(e) => setIdioma(e.target.value as 'pt' | 'en')}
          >
            <FormControlLabel
              value="pt"
              control={<Radio />}
              label="🇧🇷 Português"
              sx={{
                border: idioma === 'pt' ? '1px solid #1976d2' : '1px solid #e0e0e0',
                borderRadius: 1,
                px: 2,
                py: 1,
                mr: 1,
                transition: 'all 0.2s'
              }}
            />
            <FormControlLabel
              value="en"
              control={<Radio />}
              label="🇬🇧 English"
              sx={{
                border: idioma === 'en' ? '1px solid #1976d2' : '1px solid #e0e0e0',
                borderRadius: 1,
                px: 2,
                py: 1,
                transition: 'all 0.2s'
              }}
            />
          </RadioGroup>
        </Box>

        {/* Resumo dos Dados */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5', borderLeft: '4px solid #1976d2' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Dados do Contrato:
          </Typography>
          <Grid container spacing={2} sx={{ fontSize: '0.9rem' }}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 500 }}>Comprador:</Typography>
                <Typography>{dados.nomeComprador}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 500 }}>Placa:</Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>{dados.placa}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 500 }}>Chassi:</Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>{dados.chassi}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 500 }}>Valor Total:</Typography>
                <Typography sx={{ fontWeight: 600, color: '#2e7d32' }}>
                  {formatarMoeda(dados.valor)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 500 }}>Juros:</Typography>
                <Typography>{dados.jurosPercentual}%</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 500 }}>Parcelas:</Typography>
                <Typography>{dados.parcelas.length}x</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Avisos */}
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          📋 O contrato será gerado conforme a legislação brasileira (Código Civil e Código Penal) com cláusulas adequadas para o foro de Tsu.
        </Alert>

        {/* Tabela de Parcelas */}
        <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Parcelas:
          </Typography>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1976d2' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Parc.</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Valor</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {dados.parcelas.map((parcela, idx) => (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                  }}
                >
                  <td style={{ padding: '8px' }}>{parcela.numero}</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 500 }}>
                    {formatarMoeda(parcela.valor)}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px', fontFamily: 'monospace' }}>
                    {formatarDataBR(parcela.dataVencimento)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose}
          disabled={gerando || carregando}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleGerarPDF}
          disabled={gerando || carregando}
          variant="contained"
          startIcon={gerando ? <CircularProgress size={20} /> : <Download size={20} />}
        >
          {gerando ? 'Gerando...' : 'Gerar e Baixar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContratoDialog;
