-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Tempo de geração: 23/04/2026 às 07:17
-- Versão do servidor: 8.0.45-0ubuntu0.24.04.1
-- Versão do PHP: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `hirata_cars`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `agendamentos`
--

CREATE TABLE `agendamentos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clienteId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `veiculoId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `data_agendamento` datetime NOT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'agendado',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `anexos`
--

CREATE TABLE `anexos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidade_tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidade_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pdf_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pdf_lang` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_anexo` enum('foto','documento','contrato','recibo','outros') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'documento',
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filesize` int DEFAULT NULL,
  `mimetype` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `ordenacao` int DEFAULT '0',
  `is_principal` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `categorias_financeiro`
--

CREATE TABLE `categorias_financeiro` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Entrada','Saída') COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes`
--

CREATE TABLE `clientes` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text COLLATE utf8mb4_unicode_ci,
  `cnh_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacoes_gerais` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `clientes`
--

INSERT INTO `clientes` (`id`, `nome`, `email`, `telefone`, `endereco`, `cnh_number`, `observacoes_gerais`, `created_at`, `updated_at`) VALUES
('1', 'João Silva', 'joao.silva@email.com', '(11) 98765-4321', 'Rua das Flores, 123 - São Paulo, SP', NULL, NULL, '2026-04-21 10:32:50', '2026-04-21 10:32:50'),
('2', 'Maria Oliveira', 'maria.oliveira@email.com', '(11) 91234-5678', 'Avenida Paulista, 1000 - São Paulo, SP', NULL, NULL, '2026-04-21 10:32:50', '2026-04-21 10:32:50'),
('3', 'Carlos Santos', 'carlos.santos@email.com', '(11) 97777-8888', 'Rua Augusta, 500 - São Paulo, SP', NULL, NULL, '2026-04-21 10:32:50', '2026-04-21 10:32:50'),
('4', 'Ana Pereira', 'ana.pereira@email.com', '(11) 96666-7777', 'Rua Oscar Freire, 200 - São Paulo, SP', NULL, NULL, '2026-04-21 10:32:50', '2026-04-21 10:32:50'),
('5', 'Roberto Almeida', 'roberto.almeida@email.com', '(11) 95555-4444', 'Alameda Santos, 1500 - São Paulo, SP', NULL, NULL, '2026-04-21 10:32:50', '2026-04-21 10:32:50');

-- --------------------------------------------------------

--
-- Estrutura para tabela `client_documents`
--

CREATE TABLE `client_documents` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pdf_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pdf_lang` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_anexo` enum('foto','documento','contrato','recibo','outros') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'documento',
  `contract_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `client_interactions`
--

CREATE TABLE `client_interactions` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `interaction_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `observation` text COLLATE utf8mb4_unicode_ci,
  `interaction_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'atendimento',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `configuracoes`
--

CREATE TABLE `configuracoes` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senhaHash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nomeEmpresa` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text COLLATE utf8mb4_unicode_ci,
  `telefone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numeroAutorizacao` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `documentos`
--

CREATE TABLE `documentos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` enum('cliente','veiculo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `base64` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `anotacao` text COLLATE utf8mb4_unicode_ci,
  `categoria` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia_tipo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `arquivo_original` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_upload` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `financeiro`
--

CREATE TABLE `financeiro` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` date NOT NULL,
  `categoria` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Entrada','Saída') COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` decimal(12,2) NOT NULL DEFAULT '0.00',
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `categoria_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `ordem_servico_pecas`
--

CREATE TABLE `ordem_servico_pecas` (
  `ordemServicoId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pecaId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `ordem_servico_servicos`
--

CREATE TABLE `ordem_servico_servicos` (
  `ordemServicoId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `servicoId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `ordens_servico`
--

CREATE TABLE `ordens_servico` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `veiculoId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clienteId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dataEntrada` datetime DEFAULT NULL,
  `dataSaida` datetime DEFAULT NULL,
  `status` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `servicos_ids_json` json DEFAULT NULL,
  `pecas_ids_json` json DEFAULT NULL,
  `valorTotal` decimal(15,2) DEFAULT NULL,
  `valor_base` decimal(12,2) DEFAULT NULL,
  `parcelas` int DEFAULT NULL,
  `juros` decimal(8,2) DEFAULT NULL,
  `parcelas_status_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `relatorioPath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relatorioGeradoEm` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `parcelas`
--

CREATE TABLE `parcelas` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `venda_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_parcela` int NOT NULL,
  `valor` decimal(12,2) NOT NULL DEFAULT '0.00',
  `data_vencimento` date NOT NULL,
  `status` enum('pendente','pago','atrasado','devolvido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `data_pagamento` date DEFAULT NULL,
  `cliente_nome` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_telefone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `pecas`
--

CREATE TABLE `pecas` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marca` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modeloCompativel` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preco` decimal(15,2) NOT NULL DEFAULT '0.00',
  `quantidade` int NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `servicos`
--

CREATE TABLE `servicos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `valor` decimal(15,2) NOT NULL DEFAULT '0.00',
  `tempoEstimado` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idioma` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pt',
  `senhaHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cargo` enum('admin','mecanico','vendedor') COLLATE utf8mb4_unicode_ci DEFAULT 'mecanico'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `usuarios`
--

INSERT INTO `usuarios` (`id`, `nome`, `email`, `idioma`, `senhaHash`, `createdAt`, `updatedAt`, `cargo`) VALUES
('usr1776928497301751', 'admin@hiratacars.jp', '', 'pt', 'sha256:55d1a6c9cca3e9b35ed8274eead1eb3c:7b6f9cdd399b09a6cd601dd4fe0527b7d83bcde0cdac1d17abfe71180091bbce', '2026-04-23 16:14:57', '2026-04-23 16:14:57', 'mecanico');

-- --------------------------------------------------------

--
-- Estrutura para tabela `veiculos`
--

CREATE TABLE `veiculos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clienteId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marca` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modelo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ano` int DEFAULT NULL,
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chassi` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kilometragem` int DEFAULT NULL,
  `data_venda` date DEFAULT NULL,
  `nova_placa` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_transferencia` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `vendas`
--

CREATE TABLE `vendas` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `veiculo_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_nome_snapshot` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_telefone_snapshot` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_endereco_snapshot` text COLLATE utf8mb4_unicode_ci,
  `data_venda` datetime NOT NULL,
  `valor_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `valor_pago` decimal(12,2) DEFAULT NULL,
  `tipo_venda` enum('vista','parcelado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_parcelas` int NOT NULL DEFAULT '1',
  `juros` decimal(8,2) NOT NULL DEFAULT '0.00',
  `status_venda` enum('ativo','quitado','devolvido','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `foro_pagamento` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome_contrato` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chassi` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_quitar` datetime DEFAULT NULL,
  `recibo_pdf` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recibo_gerado_em` datetime DEFAULT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `vendas_carros`
--

CREATE TABLE `vendas_carros` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clienteId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_nome` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_telefone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_endereco` text COLLATE utf8mb4_unicode_ci,
  `valor` decimal(12,2) NOT NULL DEFAULT '0.00',
  `valor_pago` decimal(12,2) DEFAULT NULL,
  `fabricante` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modelo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ano` int DEFAULT NULL,
  `kilometragem` int DEFAULT NULL,
  `parcelas` int NOT NULL DEFAULT '1',
  `juros` decimal(8,2) NOT NULL DEFAULT '0.00',
  `valor_total` decimal(12,2) DEFAULT NULL,
  `parcelas_status_json` json DEFAULT NULL,
  `recibo_pdf` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recibo_gerado_em` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `contratoPath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contratoGeradoEm` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `vendas_parcelas`
--

CREATE TABLE `vendas_parcelas` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrato_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_parcela` int NOT NULL DEFAULT '0',
  `valor` decimal(12,2) NOT NULL,
  `data_vencimento` date NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `agendamentos`
--
ALTER TABLE `agendamentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_agendamentos_cliente` (`clienteId`),
  ADD KEY `idx_agendamentos_veiculo` (`veiculoId`);

--
-- Índices de tabela `anexos`
--
ALTER TABLE `anexos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_anexos_entidade` (`entidade_tipo`,`entidade_id`),
  ADD KEY `idx_anexos_pdf_lang` (`pdf_lang`),
  ADD KEY `idx_anexos_tipo` (`tipo_anexo`),
  ADD KEY `idx_anexos_principal` (`is_principal`);

--
-- Índices de tabela `categorias_financeiro`
--
ALTER TABLE `categorias_financeiro`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_categorias_financeiro_nome_tipo` (`nome`,`tipo`);

--
-- Índices de tabela `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_clientes_nome` (`nome`);

--
-- Índices de tabela `client_documents`
--
ALTER TABLE `client_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_client_documents_client` (`client_id`),
  ADD KEY `idx_client_documents_type` (`document_type`),
  ADD KEY `idx_client_documents_pdf_lang` (`pdf_lang`);

--
-- Índices de tabela `client_interactions`
--
ALTER TABLE `client_interactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_client_interactions_client` (`client_id`),
  ADD KEY `idx_client_interactions_date` (`created_at`);

--
-- Índices de tabela `configuracoes`
--
ALTER TABLE `configuracoes`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `documentos`
--
ALTER TABLE `documentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_documentos_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_documentos_referencia` (`referencia_tipo`,`referencia_id`);

--
-- Índices de tabela `financeiro`
--
ALTER TABLE `financeiro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_financeiro_data` (`data`),
  ADD KEY `idx_financeiro_categoria_id` (`categoria_id`);

--
-- Índices de tabela `ordem_servico_pecas`
--
ALTER TABLE `ordem_servico_pecas`
  ADD PRIMARY KEY (`ordemServicoId`,`pecaId`),
  ADD KEY `fk_os_peca_peca` (`pecaId`);

--
-- Índices de tabela `ordem_servico_servicos`
--
ALTER TABLE `ordem_servico_servicos`
  ADD PRIMARY KEY (`ordemServicoId`,`servicoId`),
  ADD KEY `fk_os_servico_servico` (`servicoId`);

--
-- Índices de tabela `ordens_servico`
--
ALTER TABLE `ordens_servico`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ordens_veiculo` (`veiculoId`),
  ADD KEY `idx_ordens_cliente` (`clienteId`);

--
-- Índices de tabela `parcelas`
--
ALTER TABLE `parcelas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_parcelas_venda` (`venda_id`);

--
-- Índices de tabela `pecas`
--
ALTER TABLE `pecas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pecas_codigo` (`codigo`);

--
-- Índices de tabela `servicos`
--
ALTER TABLE `servicos`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_usuarios_email` (`email`),
  ADD UNIQUE KEY `uq_usuarios_nome` (`nome`);

--
-- Índices de tabela `veiculos`
--
ALTER TABLE `veiculos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_veiculos_placa` (`placa`),
  ADD KEY `idx_veiculos_cliente` (`clienteId`);

--
-- Índices de tabela `vendas`
--
ALTER TABLE `vendas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vendas_cliente` (`cliente_id`),
  ADD KEY `idx_vendas_veiculo` (`veiculo_id`);

--
-- Índices de tabela `vendas_carros`
--
ALTER TABLE `vendas_carros`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vendas_carros_cliente` (`clienteId`);

--
-- Índices de tabela `vendas_parcelas`
--
ALTER TABLE `vendas_parcelas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vendas_parcelas_contrato` (`contrato_id`),
  ADD KEY `idx_vendas_parcelas_client` (`client_id`),
  ADD KEY `idx_vendas_parcelas_status` (`status`),
  ADD KEY `idx_vendas_parcelas_vencimento` (`data_vencimento`);

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `agendamentos`
--
ALTER TABLE `agendamentos`
  ADD CONSTRAINT `fk_agendamentos_clienteId` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_agendamentos_veiculoId` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `client_documents`
--
ALTER TABLE `client_documents`
  ADD CONSTRAINT `fk_client_documents_client` FOREIGN KEY (`client_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `client_interactions`
--
ALTER TABLE `client_interactions`
  ADD CONSTRAINT `fk_client_interactions_client` FOREIGN KEY (`client_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `financeiro`
--
ALTER TABLE `financeiro`
  ADD CONSTRAINT `fk_financeiro_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_financeiro` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `ordem_servico_pecas`
--
ALTER TABLE `ordem_servico_pecas`
  ADD CONSTRAINT `fk_os_peca_ordem` FOREIGN KEY (`ordemServicoId`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_os_peca_peca` FOREIGN KEY (`pecaId`) REFERENCES `pecas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Restrições para tabelas `ordem_servico_servicos`
--
ALTER TABLE `ordem_servico_servicos`
  ADD CONSTRAINT `fk_os_servico_ordem` FOREIGN KEY (`ordemServicoId`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_os_servico_servico` FOREIGN KEY (`servicoId`) REFERENCES `servicos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Restrições para tabelas `ordens_servico`
--
ALTER TABLE `ordens_servico`
  ADD CONSTRAINT `fk_ordens_clienteId` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ordens_veiculoId` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `parcelas`
--
ALTER TABLE `parcelas`
  ADD CONSTRAINT `fk_parcelas_venda` FOREIGN KEY (`venda_id`) REFERENCES `vendas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `veiculos`
--
ALTER TABLE `veiculos`
  ADD CONSTRAINT `fk_veiculos_clienteId` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `vendas`
--
ALTER TABLE `vendas`
  ADD CONSTRAINT `fk_vendas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vendas_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `vendas_carros`
--
ALTER TABLE `vendas_carros`
  ADD CONSTRAINT `fk_vendas_carros_clienteId` FOREIGN KEY (`clienteId`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `vendas_parcelas`
--
ALTER TABLE `vendas_parcelas`
  ADD CONSTRAINT `fk_vendas_parcelas_client` FOREIGN KEY (`client_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vendas_parcelas_contrato` FOREIGN KEY (`contrato_id`) REFERENCES `client_documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
