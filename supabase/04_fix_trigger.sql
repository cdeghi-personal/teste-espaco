-- ============================================================
-- Fix: trigger handle_new_user com search_path explícito
-- Rodar no SQL Editor do Supabase caso o step 3 dê erro de
-- "type user_role does not exist"
-- ============================================================

-- Recria a função com search_path = public (resolve o erro do tipo)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_app_meta_data->>'role')::public.user_role,
      'therapist'::public.user_role
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Após corrigir o trigger, crie manualmente o profile do admin.
-- Pegue o UUID em: Authentication → Users → copie o "User UID"
-- ============================================================

-- Substitua <UUID_DO_SEU_USUARIO> pelo UUID real
INSERT INTO public.profiles (id, role)
VALUES ('<UUID_DO_SEU_USUARIO>', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
