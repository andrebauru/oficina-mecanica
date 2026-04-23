const collectionConfig = {
  configuracoes: {
    table: 'configuracoes',
    idField: 'id',
    idPrefix: 'cfg',
    fields: {
      id: 'id',
      senhaHash: 'senha_hash',
      nomeEmpresa: 'nome_empresa',
      endereco: 'endereco',
      telefone: 'telefone',
      numeroAutorizacao: 'numero_autorizacao',
    },
  },
  usuarios: {
    table: 'usuarios',
    idField: 'id',
    idPrefix: 'usr',
    fields: {
      id: 'id',
      nome: 'nome',
      email: 'email',
      idioma: 'idioma',
      senhaHash: 'senha_hash',
    },
    // senhaHash é necessário para verificação client-side no login;
    // removido das respostas GET genéricas para não expor desnecessariamente
    sensitiveFields: ['senhaHash'],
  },
  clientes: {
    table: 'clientes',
    idField: 'id',
    idPrefix: 'cli',
    fields: {
      id: 'id',
      nome: 'nome',
      email: 'email',
      telefone: 'telefone',
      endereco: 'endereco',
      cnh_number: 'cnh_number',
      observacoes_gerais: 'observacoes_gerais',
    },
  },
  veiculos: {
    table: 'veiculos',
    idField: 'id',
    idPrefix: 'vei',
    fields: {
      id: 'id',
      clienteId: 'cliente_id',
      marca: 'marca',
      modelo: 'modelo',
      ano: 'ano',
      placa: 'placa',
      chassi: 'chassi',
      kilometragem: 'kilometragem',
      data_venda: 'data_venda',
      nova_placa: 'nova_placa',
      data_transferencia: 'data_transferencia',
    },
  },
  servicos: {
    table: 'servicos',
    idField: 'id',
    idPrefix: 'srv',
    fields: {
      id: 'id',
      nome: 'nome',
      descricao: 'descricao',
      valor: 'valor',
      tempoEstimado: 'tempo_estimado',
    },
  },
  pecas: {
    table: 'pecas',
    idField: 'id',
    idPrefix: 'pec',
    fields: {
      id: 'id',
      nome: 'nome',
      codigo: 'codigo',
      marca: 'marca',
      modeloCompativel: 'modelo_compativel',
      preco: 'preco',
      quantidade: 'quantidade',
    },
  },
  ordens_servico: {
    table: 'ordens_servico',
    idField: 'id',
    idPrefix: 'os',
    fields: {
      id: 'id',
      veiculoId: 'veiculo_id',
      clienteId: 'cliente_id',
      dataEntrada: 'data_entrada',
      dataSaida: 'data_saida',
      status: 'status',
      descricao: 'descricao',
      servicosIds: 'servicos_ids_json',
      pecasIds: 'pecas_ids_json',
      valorTotal: 'valor_total',
      valorBase: 'valor_base',
      parcelas: 'parcelas',
      juros: 'juros',
      parcelasStatus: 'parcelas_status_json',
    },
    jsonFields: ['servicosIds', 'pecasIds', 'parcelasStatus'],
  },
  vendas_carros: {
    table: 'vendas_carros',
    idField: 'id',
    idPrefix: 'vc',
    fields: {
      id: 'id',
      clienteId: 'cliente_id',
      clienteNome: 'cliente_nome',
      clienteTelefone: 'cliente_telefone',
      clienteEndereco: 'cliente_endereco',
      valor: 'valor',
      valorPago: 'valor_pago',
      fabricante: 'fabricante',
      modelo: 'modelo',
      ano: 'ano',
      kilometragem: 'kilometragem',
      parcelas: 'parcelas',
      juros: 'juros',
      valorTotal: 'valor_total',
      parcelasStatus: 'parcelas_status_json',
      reciboPDF: 'recibo_pdf',
      reciboGeradoEm: 'recibo_gerado_em',
    },
    jsonFields: ['parcelasStatus'],
  },
  financeiro: {
    table: 'financeiro',
    idField: 'id',
    idPrefix: 'fin',
    fields: {
      id: 'id',
      data: 'data',
      categoria: 'categoria',
      tipo: 'tipo',
      valor: 'valor',
      descricao: 'descricao',
      categoriaId: 'categoria_id',
    },
  },
  categorias_financeiro: {
    table: 'categorias_financeiro',
    idField: 'id',
    idPrefix: 'cat',
    fields: {
      id: 'id',
      nome: 'nome',
      tipo: 'tipo',
    },
  },
  documentos: {
    table: 'documentos',
    idField: 'id',
    idPrefix: 'doc',
    fields: {
      id: 'id',
      entityId: 'entity_id',
      entityType: 'entity_type',
      base64: 'base64',
      filename: 'filename',
      anotacao: 'anotacao',
      categoria: 'categoria',
      referenciaId: 'referencia_id',
      referenciaTipo: 'referencia_tipo',
      arquivoOriginal: 'arquivo_original',
      dataUpload: 'data_upload',
    },
  },
  vendas: {
    table: 'vendas',
    idField: 'id',
    idPrefix: 'v',
    fields: {
      id: 'id',
      clienteId: 'cliente_id',
      veiculoId: 'veiculo_id',
      clienteNomeSnapshot: 'cliente_nome_snapshot',
      clienteTelefoneSnapshot: 'cliente_telefone_snapshot',
      clienteEnderecoSnapshot: 'cliente_endereco_snapshot',
      dataVenda: 'data_venda',
      valorTotal: 'valor_total',
      valorPago: 'valor_pago',
      tipoVenda: 'tipo_venda',
      numeroParcelas: 'numero_parcelas',
      juros: 'juros',
      statusVenda: 'status_venda',
      foroPagamento: 'foro_pagamento',
      nomeContrato: 'nome_contrato',
      placa: 'placa',
      chassi: 'chassi',
      dataQuitar: 'data_quitar',
      reciboPDF: 'recibo_pdf',
      reciboGeradoEm: 'recibo_gerado_em',
      observacoes: 'observacoes',
    },
  },
  parcelas: {
    table: 'parcelas',
    idField: 'id',
    idPrefix: 'par',
    fields: {
      id: 'id',
      vendaId: 'venda_id',
      numeroParcela: 'numero_parcela',
      valor: 'valor',
      dataVencimento: 'data_vencimento',
      status: 'status',
      dataPagamento: 'data_pagamento',
      clienteNome: 'cliente_nome',
      clienteTelefone: 'cliente_telefone',
    },
  },
  agendamentos: {
    table: 'agendamentos',
    idField: 'id',
    idPrefix: 'agd',
    fields: {
      id: 'id',
      clienteId: 'cliente_id',
      veiculoId: 'veiculo_id',
      titulo: 'titulo',
      descricao: 'descricao',
      dataAgendamento: 'data_agendamento',
      status: 'status',
    },
  },
};

function generateId(prefix = 'id') {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function toDatabaseRecord(entityName, clientRecord) {
  const entity = collectionConfig[entityName];
  if (!entity) throw new Error(`Entidade não mapeada: ${entityName}`);

  const dbRecord = {};
  for (const [clientKey, dbKey] of Object.entries(entity.fields)) {
    if (clientRecord[clientKey] === undefined) continue;

    if ((entity.jsonFields || []).includes(clientKey)) {
      dbRecord[dbKey] = clientRecord[clientKey] == null ? null : JSON.stringify(clientRecord[clientKey]);
    } else {
      dbRecord[dbKey] = clientRecord[clientKey];
    }
  }

  if (!dbRecord[entity.idField]) {
    dbRecord[entity.idField] = generateId(entity.idPrefix);
  }

  return dbRecord;
}

function toClientRecord(entityName, dbRecord, { includeSensitive = false } = {}) {
  const entity = collectionConfig[entityName];
  if (!entity) throw new Error(`Entidade não mapeada: ${entityName}`);

  const clientRecord = {};
  for (const [clientKey, dbKey] of Object.entries(entity.fields)) {
    if (!includeSensitive && (entity.sensitiveFields || []).includes(clientKey)) continue;
    const value = dbRecord[dbKey];

    if ((entity.jsonFields || []).includes(clientKey)) {
      if (value == null || value === '') {
        clientRecord[clientKey] = [];
      } else if (Array.isArray(value)) {
        clientRecord[clientKey] = value;
      } else {
        try {
          clientRecord[clientKey] = JSON.parse(value);
        } catch {
          clientRecord[clientKey] = [];
        }
      }
      continue;
    }

    clientRecord[clientKey] = value;
  }

  return clientRecord;
}

function allowedFilterMap(entityName) {
  const entity = collectionConfig[entityName];
  return entity ? entity.fields : {};
}

module.exports = {
  collectionConfig,
  toDatabaseRecord,
  toClientRecord,
  allowedFilterMap,
};
