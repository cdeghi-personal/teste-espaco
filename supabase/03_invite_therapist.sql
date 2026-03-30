-- ============================================================
-- Espaço Casa Amarela — Função: Convidar Terapeuta
-- Chamada via Edge Function ou pelo painel Supabase
-- ============================================================

-- Esta função é chamada pelo admin para criar um terapeuta e
-- enviar o convite de acesso por email.
--
-- Fluxo:
--   1. Admin preenche o cadastro do terapeuta no sistema
--   2. Sistema insere o registro em `therapists`
--   3. Sistema chama supabase.auth.admin.inviteUserByEmail(email)
--      com app_metadata: { role: 'therapist', therapist_id: <id> }
--   4. O trigger handle_new_user() cria o profile automaticamente
--   5. Terapeuta recebe email → clica no link → define senha
--   6. No callback de auth, o therapist.user_id é preenchido

-- Esta função vincula um auth.user a um therapist após aceite do convite.
-- Chamada via webhook ou edge function no evento SIGNED_IN pela primeira vez.

create or replace function link_therapist_user(p_user_id uuid, p_therapist_id uuid)
returns void as $$
begin
  update public.therapists
  set user_id = p_user_id, updated_at = now()
  where id = p_therapist_id and user_id is null;
end;
$$ language plpgsql security definer;

-- ============================================================
-- COMO USAR NO CÓDIGO REACT (referência)
-- ============================================================

-- 1. Criar terapeuta (sem user_id ainda):
--    const { data } = await supabase
--      .from('therapists')
--      .insert({ name, specialty, email, ... })
--      .select().single()
--
-- 2. Convidar via Admin API (chamar de Edge Function):
--    await supabase.auth.admin.inviteUserByEmail(email, {
--      data: {               // vai para raw_app_meta_data
--        role: 'therapist',
--        therapist_id: data.id
--      }
--    })
--
-- 3. No callback de auth (quando terapeuta faz login pela 1ª vez):
--    const therapistId = session.user.app_metadata?.therapist_id
--    if (therapistId) {
--      await supabase.rpc('link_therapist_user', {
--        p_user_id: session.user.id,
--        p_therapist_id: therapistId
--      })
--    }
