// Supabase Edge Function — transcribe-clinical-audio
//
// Preenchimento por voz nos campos clínicos do ConsultationFormModal:
// recebe um áudio curto, transcreve (OpenAI Whisper/transcribe) e revisa o
// texto (OpenAI chat completions), sem nunca acrescentar conteúdo clínico.
//
// Diferente de dashboard-greeting e suggest-convenio (JWT Verification
// DESATIVADO, sem client Supabase nenhum), esta função É AUTENTICADA:
// JWT Verification deve estar ATIVADO no Dashboard do Supabase. Exige
// Authorization, identifica o usuário via auth.getUser() e delega toda a
// decisão de autorização à RPC can_use_voice_transcription_for_consultation
// (SECURITY DEFINER, migration 124) — nunca confia em nada vindo do cliente
// além do necessário pra localizar o atendimento e o campo.
//
// Não usa client service_role — não há motivo legítimo pra bypassar RLS
// aqui além do que a RPC já encapsula com segurança.
//
// Áudio nunca é gravado em disco/Storage: existe só na memória desta
// invocação, é descartado ao final (sucesso ou erro). Nenhum log deste
// arquivo grava conteúdo de áudio, transcrição ou texto revisado — só
// metadados operacionais (via console.error, sem conteúdo sensível).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowlist de campos — nunca aceitar nome de campo arbitrário do cliente.
const ALLOWED_FIELDS: Record<string, string> = {
  mainObjective: 'Objetivo Principal da Sessão',
  evolutionNotes: 'Relato da Sessão / Evolução',
  nextObjectives: 'Objetivo da Próxima Sessão',
  guardianFeedback: 'Orientações Passadas ao Responsável',
}

// Frase de contexto por campo — só o suficiente pra revisão fazer sentido,
// nunca dados do paciente/prontuário/outros atendimentos.
const FIELD_CONTEXT: Record<string, string> = {
  mainObjective: 'Este texto é o objetivo principal de uma sessão terapêutica.',
  evolutionNotes: 'Este texto é o relato/evolução clínica de uma sessão terapêutica.',
  nextObjectives: 'Este texto é o objetivo planejado para a próxima sessão terapêutica.',
  guardianFeedback: 'Este texto são as orientações passadas ao responsável ao final da sessão.',
}

// audio/webm;codecs=opus, audio/mp4, audio/webm, audio/ogg;codecs=opus e variações.
const ALLOWED_AUDIO_PREFIXES = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']
const MAX_AUDIO_BYTES = 20 * 1024 * 1024 // ~20MB — folga confortável sobre 3min reais, abaixo do limite de 25MB da OpenAI

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const REVIEW_SYSTEM_PROMPT = `Você está revisando uma transcrição ditada por um profissional de saúde para preenchimento de um registro clínico.

Revise o texto para torná-lo claro, objetivo, bem pontuado e profissional.

Você pode:
- remover hesitações como "ah", "é...", "hum" e "tipo";
- remover repetições acidentais;
- corrigir pontuação, ortografia, concordância e construção das frases;
- organizar o conteúdo em parágrafos;
- melhorar a fluidez sem mudar o conteúdo.

Você não pode:
- acrescentar fatos;
- criar diagnósticos;
- inferir informações;
- inventar condutas;
- transformar hipótese em certeza;
- remover ressalvas;
- alterar nomes, datas, doses ou termos técnicos;
- alterar negações;
- omitir informações clínicas;
- interpretar além do que foi dito;
- misturar informações de outros pacientes ou atendimentos.

Preserve integralmente:
- fatos;
- nomes;
- números;
- datas;
- doses;
- medicamentos;
- negações;
- hipóteses;
- dúvidas;
- incertezas;
- termos clínicos.

Retorne somente o texto revisado, sem explicações, títulos ou comentários adicionais.

A mensagem do usuário pode incluir uma seção de CONTEXTO (ex.: especialidade do atendimento) antes da transcrição, claramente demarcada. Use esse contexto apenas para entender melhor o vocabulário e os termos técnicos esperados — nunca repita, resuma ou inclua o conteúdo do CONTEXTO na sua resposta. Sua resposta deve conter exclusivamente a revisão do texto que estiver na seção TRANSCRIÇÃO.

Quando a especialidade do atendimento estiver informada no CONTEXTO, revise como um profissional experiente dessa especialidade revisaria o próprio registro — usando o vocabulário e os termos técnicos apropriados a essa área. Isso nunca autoriza acrescentar diagnóstico, conduta ou qualquer informação que não tenha sido dita na transcrição — só ajusta o tom e o vocabulário ao que é esperado nessa especialidade.`

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Autenticação ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Não autorizado.' }, 401)
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401)
    }

    // ── Corpo da requisição (multipart) ──────────────────────────────────
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return jsonResponse({ error: 'Requisição inválida.' }, 400)
    }

    const audio = form.get('audio')
    const consultationId = form.get('consultationId')
    const fieldName = form.get('fieldName')

    if (!(audio instanceof File)) {
      return jsonResponse({ error: 'Áudio ausente.' }, 400)
    }
    if (typeof consultationId !== 'string' || !UUID_RE.test(consultationId)) {
      return jsonResponse({ error: 'Atendimento inválido.' }, 400)
    }
    if (typeof fieldName !== 'string' || !ALLOWED_FIELDS[fieldName]) {
      return jsonResponse({ error: 'Campo inválido.' }, 400)
    }
    const mime = (audio.type || '').toLowerCase()
    if (!ALLOWED_AUDIO_PREFIXES.some(p => mime.startsWith(p))) {
      return jsonResponse({ error: 'Formato de áudio não suportado.' }, 400)
    }
    if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
      return jsonResponse({ error: 'Áudio inválido ou grande demais.' }, 400)
    }

    // ── Autorização — RPC é a única fonte de verdade, nunca o frontend ────
    const { data: authz, error: authzError } = await supabaseUser.rpc(
      'can_use_voice_transcription_for_consultation',
      { p_consultation_id: consultationId }
    )
    if (authzError || !authz?.allowed) {
      return jsonResponse({ error: 'Não autorizado.' }, 403)
    }
    // Especialidade do atendimento (label amigável, ex.: "Fisioterapia"),
    // resolvida pela própria RPC — só um dado de contexto pra ajudar o
    // modelo a não "corrigir" termos técnicos válidos da área. Nunca
    // influencia o conteúdo ditado.
    const specialtyLabel = typeof authz.specialty === 'string' ? authz.specialty : null

    // ── Secrets ─────────────────────────────────────────────────────────
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: 'Serviço de transcrição temporariamente indisponível.' }, 500)
    }
    const transcriptionModel = Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') || 'gpt-4o-mini-transcribe'
    const reviewModel = Deno.env.get('OPENAI_CLINICAL_REVIEW_MODEL') || 'gpt-4o-mini'

    // ── Etapa 1: transcrição ───────────────────────────────────────────────
    const transcribeForm = new FormData()
    transcribeForm.append('file', audio, audio.name || 'gravacao.webm')
    transcribeForm.append('model', transcriptionModel)
    transcribeForm.append('language', 'pt')
    transcribeForm.append('prompt', `Contexto: registro clínico de ${specialtyLabel || 'terapia'}, campo "${ALLOWED_FIELDS[fieldName]}".`)

    const transcribeRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: transcribeForm,
    })

    if (!transcribeRes.ok) {
      console.error('[transcribe-clinical-audio] transcription failed', {
        userId: user.id, consultationId, fieldName, status: transcribeRes.status,
      })
      return jsonResponse({ error: 'Não foi possível transcrever o áudio. Tente novamente.' }, 502)
    }

    const transcribeData = await transcribeRes.json()
    const rawTranscript = (transcribeData?.text || '').trim()

    if (!rawTranscript) {
      return jsonResponse({ error: 'Não foi possível transcrever o áudio. Tente novamente.' }, 422)
    }

    // ── Etapa 2: revisão profissional ──────────────────────────────────────
    try {
      const reviewRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: reviewModel,
          messages: [
            { role: 'system', content: REVIEW_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                '=== CONTEXTO (não incluir na resposta; só para entender vocabulário/termos esperados) ===',
                specialtyLabel ? `Especialidade do atendimento: ${specialtyLabel}` : null,
                FIELD_CONTEXT[fieldName],
                '',
                '=== TRANSCRIÇÃO (revise somente este texto; retorne só a revisão dele) ===',
                rawTranscript,
              ].filter(line => line !== null).join('\n'),
            },
          ],
          temperature: 0.1,
        }),
      })

      if (!reviewRes.ok) {
        console.error('[transcribe-clinical-audio] review failed', {
          userId: user.id, consultationId, fieldName, status: reviewRes.status,
        })
        return jsonResponse({ rawTranscript, reviewedText: null, reviewFailed: true, fieldName })
      }

      const reviewData = await reviewRes.json()
      const reviewedText = (reviewData?.choices?.[0]?.message?.content || '').trim()

      if (!reviewedText) {
        return jsonResponse({ rawTranscript, reviewedText: null, reviewFailed: true, fieldName })
      }

      return jsonResponse({ rawTranscript, reviewedText, fieldName })
    } catch (reviewErr) {
      console.error('[transcribe-clinical-audio] review exception', {
        userId: user.id, consultationId, fieldName, message: (reviewErr as Error)?.message,
      })
      return jsonResponse({ rawTranscript, reviewedText: null, reviewFailed: true, fieldName })
    }
  } catch (err) {
    console.error('[transcribe-clinical-audio] unhandled error', { message: (err as Error)?.message })
    return jsonResponse({ error: 'O serviço de transcrição está temporariamente indisponível. Tente novamente mais tarde.' }, 500)
  }
})
