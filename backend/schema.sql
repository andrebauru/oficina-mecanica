CREATE DATABASE IF NOT EXISTS hirata_cars CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hirata_cars;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS parcelas;
DROP TABLE IF EXISTS documentos;
DROP TABLE IF EXISTS client_documents;
DROP TABLE IF EXISTS client_interactions;
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS vendas_carros;
DROP TABLE IF EXISTS ordem_servico_pecas;
DROP TABLE IF EXISTS ordem_servico_servicos;
DROP TABLE IF EXISTS ordens_servico;
DROP TABLE IF EXISTS agendamentos;
DROP TABLE IF EXISTS financeiro;
DROP TABLE IF EXISTS categorias_financeiro;
DROP TABLE IF EXISTS pecas;
DROP TABLE IF EXISTS servicos;
DROP TABLE IF EXISTS veiculos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS configuracoes;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE configuracoes (
  id VARCHAR(50) NOT NULL,
  senha_hash VARCHAR(255) NULL,
  nome_empresa VARCHAR(150) NULL,
  endereco TEXT NULL,
  telefone VARCHAR(40) NULL,
  numero_autorizacao VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id VARCHAR(50) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  idioma VARCHAR(10) NOT NULL DEFAULT 'pt',
  senha_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clientes (
  id VARCHAR(50) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(190) NULL,
  telefone VARCHAR(40) NULL,
  endereco TEXT NULL,
  cnh_number VARCHAR(20) NULL,
  observacoes_gerais TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_clientes_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE veiculos (
  id VARCHAR(50) NOT NULL,
  cliente_id VARCHAR(50) NOT NULL,
  marca VARCHAR(80) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  ano INT NULL,
  placa VARCHAR(20) NOT NULL,
  chassi VARCHAR(80) NULL,
  kilometragem INT NULL,
  data_venda DATE NULL,
  nova_placa VARCHAR(20) NULL,
  data_transferencia DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_veiculos_placa (placa),
  KEY idx_veiculos_cliente (cliente_id),
  KEY idx_veiculos_data_venda (data_venda),
  CONSTRAINT fk_veiculos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE servicos (
  id VARCHAR(50) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tempo_estimado VARCHAR(60) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pecas (
  id VARCHAR(50) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  codigo VARCHAR(60) NULL,
  marca VARCHAR(80) NULL,
  modelo_compativel VARCHAR(255) NULL,
  preco DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  quantidade INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pecas_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorias_financeiro (
  id VARCHAR(50) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  tipo ENUM('Entrada','Saída') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_financeiro_nome_tipo (nome, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE financeiro (
  id VARCHAR(50) NOT NULL,
  data DATE NOT NULL,
  categoria VARCHAR(120) NOT NULL,
  tipo ENUM('Entrada','Saída') NOT NULL,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descricao TEXT NULL,
  categoria_id VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_financeiro_data (data),
  KEY idx_financeiro_categoria_id (categoria_id),
  CONSTRAINT fk_financeiro_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_financeiro (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE agendamentos (
  id VARCHAR(50) NOT NULL,
  cliente_id VARCHAR(50) NOT NULL,
  veiculo_id VARCHAR(50) NULL,
  titulo VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  data_agendamento DATETIME NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'agendado',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agendamentos_cliente (cliente_id),
  KEY idx_agendamentos_veiculo (veiculo_id),
  CONSTRAINT fk_agendamentos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_agendamentos_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculos (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ordens_servico (
  id VARCHAR(50) NOT NULL,
  veiculo_id VARCHAR(50) NOT NULL,
  cliente_id VARCHAR(50) NULL,
  data_entrada DATETIME NOT NULL,
  data_saida DATETIME NULL,
  status VARCHAR(60) NOT NULL,
  descricao TEXT NULL,
  servicos_ids_json JSON NULL,
  pecas_ids_json JSON NULL,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  valor_base DECIMAL(12,2) NULL,
  parcelas INT NULL,
  juros DECIMAL(8,2) NULL,
  parcelas_status_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ordens_veiculo (veiculo_id),
  KEY idx_ordens_cliente (cliente_id),
  CONSTRAINT fk_ordens_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ordens_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ordem_servico_servicos (
  ordem_servico_id VARCHAR(50) NOT NULL,
  servico_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (ordem_servico_id, servico_id),
  CONSTRAINT fk_os_servico_ordem FOREIGN KEY (ordem_servico_id) REFERENCES ordens_servico (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_os_servico_servico FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ordem_servico_pecas (
  ordem_servico_id VARCHAR(50) NOT NULL,
  peca_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (ordem_servico_id, peca_id),
  CONSTRAINT fk_os_peca_ordem FOREIGN KEY (ordem_servico_id) REFERENCES ordens_servico (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_os_peca_peca FOREIGN KEY (peca_id) REFERENCES pecas (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendas_carros (
  id VARCHAR(50) NOT NULL,
  cliente_id VARCHAR(50) NULL,
  cliente_nome VARCHAR(150) NULL,
  cliente_telefone VARCHAR(40) NULL,
  cliente_endereco TEXT NULL,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  valor_pago DECIMAL(12,2) NULL,
  fabricante VARCHAR(80) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  ano INT NULL,
  kilometragem INT NULL,
  parcelas INT NOT NULL DEFAULT 1,
  juros DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  valor_total DECIMAL(12,2) NULL,
  parcelas_status_json JSON NULL,
  recibo_pdf VARCHAR(255) NULL,
  recibo_gerado_em DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vendas_carros_cliente (cliente_id),
  CONSTRAINT fk_vendas_carros_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendas (
  id VARCHAR(50) NOT NULL,
  cliente_id VARCHAR(50) NOT NULL,
  veiculo_id VARCHAR(50) NOT NULL,
  cliente_nome_snapshot VARCHAR(150) NULL,
  cliente_telefone_snapshot VARCHAR(40) NULL,
  cliente_endereco_snapshot TEXT NULL,
  data_venda DATETIME NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  valor_pago DECIMAL(12,2) NULL,
  tipo_venda ENUM('vista','parcelado') NOT NULL,
  numero_parcelas INT NOT NULL DEFAULT 1,
  juros DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  status_venda ENUM('ativo','quitado','devolvido','cancelado') NOT NULL DEFAULT 'ativo',
  foro_pagamento VARCHAR(120) NULL,
  nome_contrato VARCHAR(255) NULL,
  placa VARCHAR(20) NULL,
  chassi VARCHAR(80) NULL,
  data_quitar DATETIME NULL,
  recibo_pdf VARCHAR(255) NULL,
  recibo_gerado_em DATETIME NULL,
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vendas_cliente (cliente_id),
  KEY idx_vendas_veiculo (veiculo_id),
  CONSTRAINT fk_vendas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vendas_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parcelas (
  id VARCHAR(50) NOT NULL,
  venda_id VARCHAR(50) NOT NULL,
  numero_parcela INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  data_vencimento DATE NOT NULL,
  status ENUM('pendente','pago','atrasado','devolvido') NOT NULL DEFAULT 'pendente',
  data_pagamento DATE NULL,
  cliente_nome VARCHAR(150) NULL,
  cliente_telefone VARCHAR(40) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_parcelas_venda (venda_id),
  CONSTRAINT fk_parcelas_venda FOREIGN KEY (venda_id) REFERENCES vendas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documentos (
  id VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  entity_type ENUM('cliente','veiculo') NOT NULL,
  base64 LONGTEXT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  anotacao TEXT NULL,
  categoria VARCHAR(60) NULL,
  referencia_id VARCHAR(50) NULL,
  referencia_tipo VARCHAR(50) NULL,
  arquivo_original VARCHAR(255) NULL,
  data_upload DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documentos_entity (entity_type, entity_id),
  KEY idx_documentos_referencia (referencia_tipo, referencia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE client_interactions (
  id VARCHAR(50) NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  interaction_text TEXT NOT NULL,
  observation TEXT NULL,
  interaction_type VARCHAR(50) NULL DEFAULT 'atendimento',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client_interactions_client (client_id),
  KEY idx_client_interactions_date (created_at),
  CONSTRAINT fk_client_interactions_client FOREIGN KEY (client_id) REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE client_documents (
  id VARCHAR(50) NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  path VARCHAR(255) NOT NULL,
  contract_photo VARCHAR(255) NULL,
  file_size INT NULL,
  original_filename VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client_documents_client (client_id),
  KEY idx_client_documents_type (document_type),
  CONSTRAINT fk_client_documents_client FOREIGN KEY (client_id) REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendas_parcelas (
  id VARCHAR(50) NOT NULL,
  contrato_id VARCHAR(50) NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  numero_parcela INT NOT NULL DEFAULT 0,
  valor DECIMAL(12, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pendente',
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vendas_parcelas_contrato (contrato_id),
  KEY idx_vendas_parcelas_client (client_id),
  KEY idx_vendas_parcelas_status (status),
  KEY idx_vendas_parcelas_vencimento (data_vencimento),
  CONSTRAINT fk_vendas_parcelas_contrato FOREIGN KEY (contrato_id) REFERENCES client_documents (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vendas_parcelas_client FOREIGN KEY (client_id) REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;