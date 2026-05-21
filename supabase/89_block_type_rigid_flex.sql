-- 89_block_type_rigid_flex.sql
-- Substitui os valores TOTAL/PARTIAL por RIGID/FLEX nas tabelas de bloqueio de agenda.
-- Nomenclatura final:
--   RIGID = bloqueio rígido (conflito forte — ex: aula, ausência, compromisso externo)
--   FLEX  = bloqueio flexível (alerta — ex: reunião, home office)

-- Remove constraints de block_type dinamicamente (nome pode variar)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'calendar_blocks' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%block_type%'
  LOOP
    EXECUTE 'ALTER TABLE calendar_blocks DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;

  FOR r IN
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'calendar_block_series' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%block_type%'
  LOOP
    EXECUTE 'ALTER TABLE calendar_block_series DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- Migra dados existentes: TOTAL → RIGID, PARTIAL → FLEX
UPDATE calendar_blocks       SET block_type = 'RIGID' WHERE block_type = 'TOTAL';
UPDATE calendar_blocks       SET block_type = 'FLEX'  WHERE block_type = 'PARTIAL';
UPDATE calendar_block_series SET block_type = 'RIGID' WHERE block_type = 'TOTAL';
UPDATE calendar_block_series SET block_type = 'FLEX'  WHERE block_type = 'PARTIAL';

-- Adiciona novas constraints com os valores finais
ALTER TABLE calendar_blocks
  ADD CONSTRAINT calendar_blocks_block_type_check
  CHECK (block_type IN ('RIGID', 'FLEX'));

ALTER TABLE calendar_block_series
  ADD CONSTRAINT calendar_block_series_block_type_check
  CHECK (block_type IN ('RIGID', 'FLEX'));
