import { Box, Grid, Typography, Card, CardContent, CardHeader, List, ListItemButton, ListItemText, Divider } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/formatters';

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
  parcelasStatus?: boolean[];
}

const Dashboard = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [vendasCarros, setVendasCarros] = useState<VendaCarro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesRes, veiculosRes, ordensRes, vendasRes] = await Promise.all([
          axios.get('http://localhost:3001/clientes'),
          axios.get('http://localhost:3001/veiculos'),
          axios.get('http://localhost:3001/ordens_servico'),
          axios.get('http://localhost:3001/vendas_carros')
        ]);

        setClientes(clientesRes.data);
        setVeiculos(veiculosRes.data);
        setOrdensServico(ordensRes.data);
        setVendasCarros(vendasRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular estatísticas
  const totalClientes = clientes.length;
  const totalVeiculos = veiculos.length;
  const ordensEmAndamento = ordensServico.filter(ordem => ordem.status === 'Em andamento').length;
  const faturamentoTotal = ordensServico.reduce((acc, ordem) => acc + ordem.valorTotal, 0);

  // A receber / Já recebido (OS)
  let aReceberOS = 0;
  let jaRecebidoOS = 0;
  ordensServico.forEach(ordem => {
    if (ordem.parcelasStatus && ordem.parcelasStatus.length > 0) {
      const parcCount = ordem.parcelas ?? 1;
      const valorParcela = (ordem.valorTotal || 0) / parcCount;
      ordem.parcelasStatus.forEach(pago => {
        if (pago) jaRecebidoOS += valorParcela;
        else aReceberOS += valorParcela;
      });
    } else {
      if (['Concluído', 'Entregue'].includes(ordem.status)) jaRecebidoOS += ordem.valorTotal || 0;
      else aReceberOS += ordem.valorTotal || 0;
    }
  });

  // A receber / Já recebido (Vendas de Carros)
  let aReceberVC = 0;
  let jaRecebidoVC = 0;
  vendasCarros.forEach(venda => {
    const vt = venda.valorTotal ?? venda.valor;
    if (venda.parcelasStatus && venda.parcelasStatus.length > 0) {
      const parcCount = venda.parcelas ?? 1;
      const valorParcela = vt / parcCount;
      venda.parcelasStatus.forEach(pago => {
        if (pago) jaRecebidoVC += valorParcela;
        else aReceberVC += valorParcela;
      });
    } else {
      jaRecebidoVC += vt; // venda sem controle = assume recebida
    }
  });

  const totalAReceber = aReceberOS + aReceberVC;
  const totalJaRecebido = jaRecebidoOS + jaRecebidoVC;

  // Ordenar ordens de serviço por data (mais recentes primeiro)
  const ordensRecentes = [...ordensServico]
    .sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime())
    .slice(0, 5);

  // Últimas 5 vendas de carros (por ID decrescente)
  const ultimasVendas = [...vendasCarros]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (loading) {
    return <Typography>Carregando...</Typography>;
  }

  const getVeiculoInfo = (veiculoId: string) => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    if (!veiculo) return 'Veículo não encontrado';
    return `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
  };

  const statCards = [
    { label: 'Clientes', value: totalClientes, icon: <PeopleIcon color="primary" sx={{ fontSize: 38 }} />, color: undefined },
    { label: 'Veículos', value: totalVeiculos, icon: <DirectionsCarIcon color="primary" sx={{ fontSize: 38 }} />, color: undefined },
    { label: 'OS em Andamento', value: ordensEmAndamento, icon: <BuildIcon color="warning" sx={{ fontSize: 38 }} />, color: undefined },
    { label: 'Faturamento Total (OS)', value: formatCurrency(faturamentoTotal), icon: <AttachMoneyIcon color="success" sx={{ fontSize: 38 }} />, color: undefined },
    { label: 'A Receber', value: formatCurrency(totalAReceber), icon: <AttachMoneyIcon sx={{ fontSize: 38, color: '#d32f2f' }} />, color: '#ffebee' },
    { label: 'Já Recebido', value: formatCurrency(totalJaRecebido), icon: <AttachMoneyIcon sx={{ fontSize: 38, color: '#2e7d32' }} />, color: '#e8f5e9' },
  ];

  return (
    <Box sx={{ flexGrow: 1, mt: 4 }}>
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
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader title="Ordens de Serviço Recentes" />
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
                                Status: {ordem.status}
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2">
                                Data: {new Date(ordem.dataEntrada).toLocaleDateString('pt-BR')}
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2">
                                Valor: {formatCurrency(ordem.valorTotal)}
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
                <Typography sx={{ p: 2 }}>Nenhuma ordem de serviço encontrada</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader
              title="Últimas Vendas de Carros"
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
                <Typography sx={{ p: 2 }}>Nenhuma venda de carro cadastrada</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};


export default Dashboard;
