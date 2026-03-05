// Traduções para português e Filipino
const translations = {
  pt: {
    // Menu
    dashboard: 'Dashboard',
    os: 'OS',
    clientes: 'Clientes',
    veiculos: 'Veículos',
    servicos: 'Serviços',
    pecas: 'Peças',
    vendasCarros: 'Vendas Carros',
    financeiro: 'Financeiro',
    relatorios: 'Relatórios',
    gerarRelatorio: 'Gerar Relatório PDF',
    configuracoes: 'Configurações',
    usuarios: 'Usuários',

    // Dashboard
    totalClientes: 'Total de Clientes',
    totalVeiculos: 'Total de Veículos',
    ordensEmAndamento: 'Ordens em Andamento',
    faturamentoTotal: 'Faturamento Total',
    ultimasOrdens: 'Últimas Ordens de Serviço',
    ultimasVendas: 'Últimas Vendas de Carros',

    // Configurações
    configuracoes_titulo: 'Configurações',
    infoEmpresa: 'Informações da Empresa',
    nomeEmpresa: 'Nome da Empresa',
    endereco: 'Endereço',
    telefone: 'Telefone',
    numeroAutorizacao: 'Número de Autorização Oficial',
    salvarInformacoes: 'Salvar Informações',
    alterarSenha: 'Alterar Senha',
    senhaAtual: 'Senha Atual',
    novaSenha: 'Nova Senha',
    confirmarSenha: 'Confirmar Nova Senha',
    alterarSenhaBtn: 'Alterar Senha',
    backup: 'Backup e Restauração',
    backupDownload: 'Backup (Download)',
    backupRestore: 'Restaurar (Upload)',
    restaurando: 'Restaurando...',

    // Usuários
    usuarios_titulo: 'Usuários',
    novoUsuario: 'Novo Usuário',
    criarUsuario: 'Criar Usuário',
    editarUsuario: 'Editar Usuário',
    nome: 'Nome',
    email: 'Email',
    idioma: 'Idioma',
    acao: 'Ação',
    editar: 'Editar',
    deletar: 'Deletar',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    confirmarDelecao: 'Tem certeza que deseja deletar este usuário?',
    usuarioCriado: 'Usuário criado com sucesso',
    usuarioAtualizado: 'Usuário atualizado com sucesso',
    usuarioDeletado: 'Usuário deletado com sucesso',
    erroAoSalvar: 'Erro ao salvar usuário',
    erroAoDeletar: 'Erro ao deletar usuário',

    // Idiomas
    portugues: 'Português',
    filipino: 'Filipino',
  },
  fil: {
    // Menu
    dashboard: 'Dashboard',
    os: 'OS',
    clientes: 'Mga Kliyente',
    veiculos: 'Mga Sasakyan',
    servicos: 'Mga Serbisyo',
    pecas: 'Mga Piraso',
    vendasCarros: 'Pagbebenta ng Kotse',
    financeiro: 'Pinansyal',
    relatorios: 'Mga Ulat',
    gerarRelatorio: 'Lumikha ng PDF na Ulat',
    configuracoes: 'Mga Setting',
    usuarios: 'Mga Gumagamit',

    // Dashboard
    totalClientes: 'Kabuuang Mga Kliyente',
    totalVeiculos: 'Kabuuang Mga Sasakyan',
    ordensEmAndamento: 'Mga Order na Isinasagawa',
    faturamentoTotal: 'Kabuuang Kita',
    ultimasOrdens: 'Mga Pinakabagong Order ng Serbisyo',
    ultimasVendas: 'Mga Pinakabagong Pagbebenta ng Kotse',

    // Configurações
    configuracoes_titulo: 'Mga Setting',
    infoEmpresa: 'Impormasyon ng Kumpanya',
    nomeEmpresa: 'Pangalan ng Kumpanya',
    endereco: 'Direksyon',
    telefone: 'Telepono',
    numeroAutorizacao: 'Opisyal na Numero ng Pahintulot',
    salvarInformacoes: 'Magsave ng Impormasyon',
    alterarSenha: 'Baguhin ang Password',
    senhaAtual: 'Kasalukuyang Password',
    novaSenha: 'Bagong Password',
    confirmarSenha: 'Kumpirmahin ang Bagong Password',
    alterarSenhaBtn: 'Baguhin ang Password',
    backup: 'Backup at Pagbabalik',
    backupDownload: 'Backup (I-download)',
    backupRestore: 'Ibalik (I-upload)',
    restaurando: 'Ibinabalik...',

    // Usuários
    usuarios_titulo: 'Mga Gumagamit',
    novoUsuario: 'Bagong Gumagamit',
    criarUsuario: 'Lumikha ng Gumagamit',
    editarUsuario: 'I-edit ang Gumagamit',
    nome: 'Pangalan',
    email: 'Email',
    idioma: 'Wika',
    acao: 'Aksyon',
    editar: 'I-edit',
    deletar: 'Burahin',
    salvar: 'Magsave',
    cancelar: 'Kanselahin',
    confirmarDelecao: 'Sigurado ka na gustong burahin ang gumagamit na ito?',
    usuarioCriado: 'Gumagamit ay matagumpay na nilikha',
    usuarioAtualizado: 'Gumagamit ay matagumpay na naisip',
    usuarioDeletado: 'Gumagamit ay matagumpay na nabura',
    erroAoSalvar: 'Kamalian sa pagsave ng gumagamit',
    erroAoDeletar: 'Kamalian sa pagbura ng gumagamit',

    // Idiomas
    portugues: 'Português',
    filipino: 'Filipino',
  }
};

export type Language = 'pt' | 'fil';

export const i18n = (language: Language = 'pt') => {
  return {
    t: (key: string): string => {
      const keys = key.split('.');
      let value: any = translations[language];
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      return typeof value === 'string' ? value : key;
    },
    language
  };
};

export default translations;
