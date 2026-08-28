-- ============================================================
-- Migration: flexibilizar vendas_parcelas para suportar
-- contrato_id referenciando vendas_carros (alem de client_documents)
-- e client_id nullable (venda pode nao ter cliente cadastrado)
-- ============================================================

-- 1. Remover FK rigida que exige contrato_id em client_documents
ALTER TABLE vendas_parcelas
  DROP FOREIGN KEY fk_vendas_parcelas_contrato;

-- 2. Remover FK rigida que exige client_id em clientes (para suportar nullable)
ALTER TABLE vendas_parcelas
  DROP FOREIGN KEY fk_vendas_parcelas_client;

-- 3. Permitir client_id NULL
ALTER TABLE vendas_parcelas
  MODIFY COLUMN client_id VARCHAR(50) NULL;

-- 4. Recriar FK de client_id com ON DELETE SET NULL (tolerante a deletar cliente)
ALTER TABLE vendas_parcelas
  ADD CONSTRAINT fk_vendas_parcelas_client
    FOREIGN KEY (client_id) REFERENCES clientes (id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- contrato_id permanece como indice simples (sem FK),
-- pois pode referenciar tanto client_documents quanto vendas_carros.
