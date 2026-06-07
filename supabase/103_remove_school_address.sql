-- Remove campos de endereço da escola de patients (nunca exibidos ou usados em relatórios)
ALTER TABLE patients
  DROP COLUMN IF EXISTS school_address,
  DROP COLUMN IF EXISTS school_neighborhood,
  DROP COLUMN IF EXISTS school_city,
  DROP COLUMN IF EXISTS school_state,
  DROP COLUMN IF EXISTS school_zip;
