import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Paper,
} from '@mui/material';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { generateContratoPDFBlob } from '../utils/gerarContratoPDFBilíngue';
import { converterParaBase64 } from '../utils/gerarContratoPDF';

interface ContratoVendaDialogProps {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
  veiculoId: string;
  veiculoInfo: string;
}

export default function ContratoVendaDialog({
  open,
  onClose,
  clienteId,
  clienteNome,
  veiculoId,
  veiculoInfo,
}: ContratoVendaDialogProps) {
  const { t } = useLanguage();
  const { language } = useLanguage();
  const [idiomaSelecionado, setIdiomaSelecionado] = useState<'pt' | 'vi' | 'fil' | 'ja'>(
    (language as 'pt' | 'vi' | 'fil' | 'ja') || 'pt'
  );
  const [preco, setPreco] = useState<string>('');
  const [sinal, setSinal] = useState<string>('');
  const [parcelas, setParcelas] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);

  const nomeIdiomaMap: Record<'pt' | 'vi' | 'fil' | 'ja', string> = {
    pt: 'Português (PT)',
    vi: 'Vietnamita (VI)',
    fil: 'Filipino (FIL)',
    ja: '日本語 (JA)',
  };

  const handleGerarContrato = async () => {
    try {
      setError('');
      setSucesso(false);

      // Validar preço
      const precoNum = parseFloat(preco);
      if (!preco || isNaN(precoNum) || precoNum <= 0) {
        setError('Preço deve ser um número positivo');
        return;
      }

      const sinalNum = parseFloat(sinal || '0');
      const parcelasNum = parseInt(parcelas || '1');

      setLoading(true);

      // 1. Gerar PDF no frontend (retorna Blob)
      const pdfBlob = await generateContratoPDFBlob(
        {
          client_id: clienteId,
          nome: clienteNome,
          email: '',
          telefone: '',
          endereco: '',
          cnh_number: ''
        },
        {
          veiculo_id: veiculoId,
          marca: veiculoInfo || '',
          modelo: '',
          ano: new Date().getFullYear(),
          placa: '',
          data_venda: new Date().toISOString().split('T')[0],
          nova_placa: '',
          data_transferencia: ''
        },
        precoNum,
        sinalNum,
        parcelasNum,
        {
          nome: 'Oficina Mecânica',
          telefone: '(11) 0000-0000',
          numeroAutorizacao: '001',
          endereco: ''
        },
        idiomaSelecionado
      );

      // 2. Converter PDF para base64
      const pdfBase64 = await converterParaBase64(pdfBlob);

      // 3. Enviar para servidor com PDF em base64
      const response = await axios.post('/api/contracts/generate', {
        cliente_id: clienteId,
        veiculo_id: veiculoId,
        preco: precoNum,
        sinal: sinalNum,
        parcelas: parcelasNum,
        idioma: idiomaSelecionado,
        pdfBase64: pdfBase64, // ← Enviando PDF em base64
      });

      if (!response.data || !response.data.success) {
        throw new Error('Erro ao salvar contrato no servidor');
      }

      setSucesso(true);
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Erro ao gerar contrato:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro desconhecido ao gerar contrato'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLimparFormulario = () => {
    setPreco('');
    setSinal('');
    setParcelas('1');
    setError('');
    setSucesso(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '2px solid #FFD600' }}>
        {t('contratoBotao')}
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        {/* Informações do cliente e veículo */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'rgba(255, 214, 0, 0.05)',
            border: '1px solid rgba(255, 214, 0, 0.2)',
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)', display: 'block' }}>
            {t('cliente')}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            {clienteNome}
          </Typography>

          <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)', display: 'block' }}>
            {t('veiculo')}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {veiculoInfo}
          </Typography>
        </Paper>

        {/* Seletor de idioma */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel sx={{ mb: 1, fontWeight: 'bold' }}>{t('idiomaLabel')} {t('gerarContrato')}</FormLabel>
          <RadioGroup
            row
            value={idiomaSelecionado}
            onChange={(e) =>
              setIdiomaSelecionado(e.target.value as 'pt' | 'vi' | 'fil' | 'ja')
            }
          >
            {(['pt', 'vi', 'fil', 'ja'] as const).map((idioma) => (
              <FormControlLabel
                key={idioma}
                value={idioma}
                control={<Radio />}
                label={nomeIdiomaMap[idioma]}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {/* Campos de preço */}
        <TextField
          fullWidth
          label={t('valorTotal')}
          type="number"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          inputProps={{ step: '0.01', min: '0' }}
          sx={{ mb: 2 }}
          placeholder="0.00"
          required
        />

        <TextField
          fullWidth
          label={t('sinal')}
          type="number"
          value={sinal}
          onChange={(e) => setSinal(e.target.value)}
          inputProps={{ step: '0.01', min: '0' }}
          sx={{ mb: 2 }}
          placeholder="0.00"
        />

        <TextField
          fullWidth
          label={t('parcelas')}
          type="number"
          value={parcelas}
          onChange={(e) => setParcelas(e.target.value)}
          inputProps={{ min: '1' }}
          sx={{ mb: 2 }}
        />

        {/* Resumo */}
        {preco && (
          <Paper
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: 'rgba(76, 175, 80, 0.05)',
              border: '1px solid rgba(76, 175, 80, 0.2)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)' }}>
              {t('resumo')}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{t('valorTotal')}:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  R$ {parseFloat(preco).toFixed(2)}
                </Typography>
              </Box>
              {sinal && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{t('sinal')}:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    R$ {parseFloat(sinal).toFixed(2)}
                  </Typography>
                </Box>
              )}
              {sinal && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Restante:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    R$ {(parseFloat(preco) - parseFloat(sinal || '0')).toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        )}

        {/* Mensagens de erro e sucesso */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {sucesso && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('contratoGerado')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #eee', p: 2 }}>
        <Button
          onClick={() => {
            handleLimparFormulario();
            onClose();
          }}
          disabled={loading}
        >
          {t('cancelar')}
        </Button>
        <Button onClick={handleLimparFormulario} disabled={loading} variant="outlined">
          Limpar
        </Button>
        <Button
          onClick={handleGerarContrato}
          variant="contained"
          disabled={loading || !preco}
          sx={{
            background: loading ? '#ccc' : '#FFD600',
            color: '#000',
            fontWeight: 'bold',
            '&:hover': { background: '#FFC600' },
          }}
        >
          {loading ? <CircularProgress size={24} /> : t('gerarContrato')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
