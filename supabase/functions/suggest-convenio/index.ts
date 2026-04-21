// Supabase Edge Function — suggest-convenio
// Gera sugestões de texto para o relatório de convênio baseadas nos relatos reais dos atendimentos.
// JWT Verification deve estar DESATIVADO.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente especializado em relatórios clínicos para convênios de saúde de uma clínica de terapias infantis no Brasil.

Sua tarefa é SINTETIZAR os relatos de múltiplas sessões em três textos coerentes.

INSTRUÇÕES:
- Leia todos os relatos e identifique os temas recorrentes e pontos principais do período
- Escreva uma síntese — não copie frases, não liste sessão por sessão, não concatene os textos
- Agrupe objetivos similares das diferentes sessões em um único item consolidado
- Para o desempenho, destaque padrões de evolução observados ao longo do período, não sessão a sessão
- Mencione apenas o que está presente nos relatos; não use conhecimento externo para preencher lacunas
- Use português brasileiro formal e clínico, sem markdown nem formatação especial`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { especialidade, diagnostico, numSessoes, terapeutaNome, sessionDetails, aiSystemPrompt } = await req.json()

    if (!especialidade || !numSessoes) {
      return new Response(JSON.stringify({ error: 'Especialidade e número de sessões são obrigatórios.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const temConteudo = !!sessionDetails

    const systemPrompt = (aiSystemPrompt && aiSystemPrompt.trim()) ? aiSystemPrompt.trim() : DEFAULT_SYSTEM_PROMPT

    const userPrompt = temConteudo
      ? `Redija os três textos abaixo para um relatório ao convênio, sintetizando os relatos das sessões.

Dados do atendimento:
- Especialidade: ${especialidade}
- Diagnóstico: ${diagnostico || 'não informado'}
- Total de sessões: ${numSessoes}
- Terapeuta: ${terapeutaNome || 'não informado'}

Relatos das sessões registrados no sistema:
${sessionDetails}

Retorne SOMENTE um objeto JSON com os três campos:
{
  "encaminhamento": "Um parágrafo sobre o motivo do encaminhamento e os objetivos do acompanhamento, derivado do diagnóstico informado e dos temas recorrentes nos relatos.",
  "objetivos": "Síntese dos objetivos trabalhados nas sessões, agrupando objetivos similares em itens consolidados — um por linha separado por \\n.",
  "desempenho": "Um parágrafo sobre o desempenho do paciente ao longo do período, destacando padrões de evolução observados nos relatos."
}`
      : `Os atendimentos deste período não têm relatos detalhados registrados no sistema. Gere textos genéricos e conservadores, deixando claro que são sugestões que o terapeuta deve adaptar.

Dados disponíveis:
- Especialidade: ${especialidade}
- Diagnóstico: ${diagnostico || 'não informado'}
- Total de sessões: ${numSessoes}
- Terapeuta: ${terapeutaNome || 'não informado'}

Retorne SOMENTE um objeto JSON com os três campos:
{
  "encaminhamento": "Parágrafo genérico sobre o motivo do encaminhamento considerando apenas o diagnóstico informado. Não invente características do paciente.",
  "objetivos": "Objetivos típicos e genéricos para esta especialidade com este diagnóstico, um por linha separado por \\n. Deixe claro que são sugestões.",
  "desempenho": "Parágrafo genérico e cauteloso sem afirmar avanços específicos. Use termos como 'de forma geral' e 'conforme o plano terapêutico'. Não invente dados."
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI error status:', response.status, err)
      return new Response(JSON.stringify({ error: `OpenAI error ${response.status}: ${err}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiData = await response.json()
    const content = openaiData.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return new Response(JSON.stringify({
      encaminhamento: parsed.encaminhamento || '',
      objetivos: parsed.objetivos || '',
      desempenho: parsed.desempenho || '',
      baseadoEmAtendimentos: temConteudo,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})