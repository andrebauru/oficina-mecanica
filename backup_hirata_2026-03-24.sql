-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: hirata_cars
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agendamentos`
--

DROP TABLE IF EXISTS `agendamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agendamentos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `veiculo_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `data_agendamento` datetime NOT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'agendado',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agendamentos_cliente` (`cliente_id`),
  KEY `idx_agendamentos_veiculo` (`veiculo_id`),
  CONSTRAINT `fk_agendamentos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agendamentos`
--

LOCK TABLES `agendamentos` WRITE;
/*!40000 ALTER TABLE `agendamentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `agendamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias_financeiro`
--

DROP TABLE IF EXISTS `categorias_financeiro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias_financeiro` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Entrada','Saída') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categorias_financeiro_nome_tipo` (`nome`,`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias_financeiro`
--

LOCK TABLES `categorias_financeiro` WRITE;
/*!40000 ALTER TABLE `categorias_financeiro` DISABLE KEYS */;
/*!40000 ALTER TABLE `categorias_financeiro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clientes_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracoes`
--

DROP TABLE IF EXISTS `configuracoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracoes` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome_empresa` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text COLLATE utf8mb4_unicode_ci,
  `telefone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_autorizacao` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracoes`
--

LOCK TABLES `configuracoes` WRITE;
/*!40000 ALTER TABLE `configuracoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `configuracoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentos`
--

DROP TABLE IF EXISTS `documentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_documentos_entity` (`entity_type`,`entity_id`),
  KEY `idx_documentos_referencia` (`referencia_tipo`,`referencia_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentos`
--

LOCK TABLES `documentos` WRITE;
/*!40000 ALTER TABLE `documentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `documentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financeiro`
--

DROP TABLE IF EXISTS `financeiro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financeiro` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` date NOT NULL,
  `categoria` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Entrada','Saída') COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` decimal(12,2) NOT NULL DEFAULT '0.00',
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `categoria_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_financeiro_data` (`data`),
  KEY `idx_financeiro_categoria_id` (`categoria_id`),
  CONSTRAINT `fk_financeiro_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_financeiro` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financeiro`
--

LOCK TABLES `financeiro` WRITE;
/*!40000 ALTER TABLE `financeiro` DISABLE KEYS */;
/*!40000 ALTER TABLE `financeiro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ordem_servico_pecas`
--

DROP TABLE IF EXISTS `ordem_servico_pecas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordem_servico_pecas` (
  `ordem_servico_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `peca_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ordem_servico_id`,`peca_id`),
  KEY `fk_os_peca_peca` (`peca_id`),
  CONSTRAINT `fk_os_peca_ordem` FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_os_peca_peca` FOREIGN KEY (`peca_id`) REFERENCES `pecas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ordem_servico_pecas`
--

LOCK TABLES `ordem_servico_pecas` WRITE;
/*!40000 ALTER TABLE `ordem_servico_pecas` DISABLE KEYS */;
/*!40000 ALTER TABLE `ordem_servico_pecas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ordem_servico_servicos`
--

DROP TABLE IF EXISTS `ordem_servico_servicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordem_servico_servicos` (
  `ordem_servico_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `servico_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ordem_servico_id`,`servico_id`),
  KEY `fk_os_servico_servico` (`servico_id`),
  CONSTRAINT `fk_os_servico_ordem` FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_os_servico_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ordem_servico_servicos`
--

LOCK TABLES `ordem_servico_servicos` WRITE;
/*!40000 ALTER TABLE `ordem_servico_servicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `ordem_servico_servicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ordens_servico`
--

DROP TABLE IF EXISTS `ordens_servico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordens_servico` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `veiculo_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_entrada` datetime NOT NULL,
  `data_saida` datetime DEFAULT NULL,
  `status` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `servicos_ids_json` json DEFAULT NULL,
  `pecas_ids_json` json DEFAULT NULL,
  `valor_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `valor_base` decimal(12,2) DEFAULT NULL,
  `parcelas` int DEFAULT NULL,
  `juros` decimal(8,2) DEFAULT NULL,
  `parcelas_status_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ordens_veiculo` (`veiculo_id`),
  KEY `idx_ordens_cliente` (`cliente_id`),
  CONSTRAINT `fk_ordens_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ordens_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ordens_servico`
--

LOCK TABLES `ordens_servico` WRITE;
/*!40000 ALTER TABLE `ordens_servico` DISABLE KEYS */;
/*!40000 ALTER TABLE `ordens_servico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parcelas`
--

DROP TABLE IF EXISTS `parcelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parcelas_venda` (`venda_id`),
  CONSTRAINT `fk_parcelas_venda` FOREIGN KEY (`venda_id`) REFERENCES `vendas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parcelas`
--

LOCK TABLES `parcelas` WRITE;
/*!40000 ALTER TABLE `parcelas` DISABLE KEYS */;
/*!40000 ALTER TABLE `parcelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pecas`
--

DROP TABLE IF EXISTS `pecas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pecas` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marca` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo_compativel` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preco` decimal(12,2) NOT NULL DEFAULT '0.00',
  `quantidade` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pecas_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pecas`
--

LOCK TABLES `pecas` WRITE;
/*!40000 ALTER TABLE `pecas` DISABLE KEYS */;
/*!40000 ALTER TABLE `pecas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicos`
--

DROP TABLE IF EXISTS `servicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `valor` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tempo_estimado` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicos`
--

LOCK TABLES `servicos` WRITE;
/*!40000 ALTER TABLE `servicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `servicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idioma` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pt',
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_email` (`email`),
  UNIQUE KEY `uq_usuarios_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `veiculos`
--

DROP TABLE IF EXISTS `veiculos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `veiculos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modelo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ano` int DEFAULT NULL,
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chassi` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kilometragem` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_veiculos_placa` (`placa`),
  KEY `idx_veiculos_cliente` (`cliente_id`),
  CONSTRAINT `fk_veiculos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `veiculos`
--

LOCK TABLES `veiculos` WRITE;
/*!40000 ALTER TABLE `veiculos` DISABLE KEYS */;
/*!40000 ALTER TABLE `veiculos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendas`
--

DROP TABLE IF EXISTS `vendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vendas_cliente` (`cliente_id`),
  KEY `idx_vendas_veiculo` (`veiculo_id`),
  CONSTRAINT `fk_vendas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vendas_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendas`
--

LOCK TABLES `vendas` WRITE;
/*!40000 ALTER TABLE `vendas` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendas_carros`
--

DROP TABLE IF EXISTS `vendas_carros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendas_carros` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  PRIMARY KEY (`id`),
  KEY `idx_vendas_carros_cliente` (`cliente_id`),
  CONSTRAINT `fk_vendas_carros_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendas_carros`
--

LOCK TABLES `vendas_carros` WRITE;
/*!40000 ALTER TABLE `vendas_carros` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendas_carros` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-24  0:13:15
