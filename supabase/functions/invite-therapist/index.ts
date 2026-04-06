// Supabase Edge Function — invite-therapist
// Chamada pelo admin ao cadastrar um novo terapeuta.
// Usa a service role key (secreta) para chamar a Admin Auth API do Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Responde ao preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Valida que é um admin chamando (via JWT do usuário logado)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente com a chave do usuário (para verificar role)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verifica se o usuário logado é admin
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas admins podem convidar terapeutas' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Lê os dados do body
    const { email, therapistId, therapistName } = await req.json()
    if (!email || !therapistId) {
      return new Response(JSON.stringify({ error: 'email e therapistId são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente com service role (para Admin Auth API)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Envia o convite — o Supabase manda o email automaticamente
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role: 'therapist',
          therapist_id: therapistId,
          therapist_name: therapistName,
        },
        redirectTo: `${Deno.env.get('SITE_URL')}/login`,
      }
    )

    if (inviteError) throw inviteError

    // Ao aceitar o convite, o trigger handle_new_user() cria o profile automaticamente.
    // Após o primeiro login, o therapist.user_id é vinculado via loadUser() no AuthContext.
    // Mas fazemos o vínculo já agora via RPC para garantir consistência:
    if (inviteData?.user) {
      await supabaseAdmin.rpc('link_therapist_user', {
        p_user_id: inviteData.user.id,
        p_therapist_id: therapistId,
      })

      // Garante que o profile seja criado com role correto
      await supabaseAdmin.from('profiles').upsert({
        id: inviteData.user.id,
        role: 'therapist',
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
