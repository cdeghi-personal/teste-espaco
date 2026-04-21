// Supabase Edge Function — suggest-convenio
// Recebe contexto do relatório de convênio e retorna sugestões de texto via OpenAI.
// JWT Verification deve estar ATIVADO (usuário precisa estar logado).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

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

    const { especialidade, diagnostico, numSessoes, terapeutaNome, condutasExistentes } = await req.json()

    if (!especialidade || !numSessoes) {
      return new Response(JSON.stringify({ error: 'Especialidade e número de sessões são obrigatórios.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = `Você é um assistente especializado em elaboração de relatórios clínicos para convênios de saúde de uma clínica de terapias infantis multidisciplinares no Brasil chamada Espaço Casa Amarela.
Redija em português brasileiro, estilo formal e clínico, com frases completas e fluidas.
Não use markdown, bullets, numeração, negrito nem qualquer formatação — apenas texto corrido ou itens separados por quebra de linha quando solicitado.
Seja objetivo, profissional e não repita as mesmas expressões no mesmo parágrafo.`

    const userPrompt = `Gere os textos para um relatório ao convênio com o seguinte contexto:
- Especialidade: ${especialidade}
- Diagnóstico: ${diagnostico || 'não informado'}
- Sessões realizadas no período: ${numSessoes}
- Terapeuta: ${terapeutaNome || 'não informado'}
${condutasExistentes ? `- Condutas e objetivos registrados no prontuário: ${condutasExistentes}` : ''}

Retorne SOMENTE um objeto JSON válido com exatamente estes três campos:
{
  "encaminhamento": "parágrafo descrevendo o histórico e motivo do encaminhamento para esta especialidade e os objetivos gerais do acompanhamento",
  "objetivos": "cada objetivo em uma linha separada por \\n, sem bullets nem numeração (ex: Modulação Sensorial\\nControle Postural)",
  "desempenho": "parágrafo avaliando o desempenho no período, os avanços observados e recomendando a continuidade do atendimento"
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
        temperature: 0.7,
        max_tokens: 1200,
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
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})