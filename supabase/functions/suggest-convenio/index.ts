// Supabase Edge Function — suggest-convenio
// Recebe conteúdo real dos atendimentos e gera sugestões baseadas neles via OpenAI.
// JWT Verification deve estar DESATIVADO (autenticação via anon key do cliente Supabase).

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

    const { especialidade, diagnostico, numSessoes, terapeutaNome, sessionDetails } = await req.json()

    if (!especialidade || !numSessoes) {
      return new Response(JSON.stringify({ error: 'Especialidade e número de sessões são obrigatórios.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const temConteudo = !!sessionDetails

    const systemPrompt = `Você é um assistente especializado em elaboração de relatórios clínicos para convênios de saúde de uma clínica de terapias infantis multidisciplinares no Brasil chamada Espaço Casa Amarela.
Redija em português brasileiro, estilo formal e clínico, com frases completas e fluidas.
Não use markdown, bullets, numeração, negrito nem qualquer formatação especial — apenas texto corrido ou itens separados por quebra de linha quando solicitado.
IMPORTANTE: Baseie os textos EXCLUSIVAMENTE nas informações fornecidas dos atendimentos. Não invente objetivos, comportamentos, avanços ou situações que não estejam descritos nos relatos. Se alguma informação não estiver disponível, omita esse aspecto do texto.`

    const userPrompt = temConteudo
      ? `Gere os textos para um relatório ao convênio baseado nos atendimentos abaixo.

Contexto geral:
- Especialidade: ${especialidade}
- Diagnóstico: ${diagnostico || 'não informado'}
- Total de sessões no período: ${numSessoes}
- Terapeuta: ${terapeutaNome || 'não informado'}

Conteúdo real dos atendimentos registrados no sistema:
${sessionDetails}

Com base APENAS nas informações acima, retorne SOMENTE um objeto JSON válido com exatamente estes três campos:
{
  "encaminhamento": "parágrafo descrevendo o motivo do encaminhamento e os objetivos gerais do acompanhamento, fundamentado no diagnóstico e nas necessidades identificadas nos atendimentos",
  "objetivos": "lista dos objetivos trabalhados nas sessões, um por linha separado por \\n, sem bullets nem numeração — extraídos dos objetivos registrados nos atendimentos",
  "desempenho": "parágrafo avaliando o desempenho e evolução do paciente no período, baseado nos relatos de evolução registrados, e recomendando continuidade"
}`
      : `Gere os textos para um relatório ao convênio. Atenção: os atendimentos deste período não possuem relatos detalhados registrados no sistema, portanto os textos devem ser genéricos e cautelosos, sem afirmar avanços ou comportamentos específicos.

Contexto disponível:
- Especialidade: ${especialidade}
- Diagnóstico: ${diagnostico || 'não informado'}
- Total de sessões no período: ${numSessoes}
- Terapeuta: ${terapeutaNome || 'não informado'}

Retorne SOMENTE um objeto JSON válido com exatamente estes três campos:
{
  "encaminhamento": "parágrafo descrevendo o motivo geral do encaminhamento para esta especialidade considerando o diagnóstico",
  "objetivos": "objetivos típicos desta especialidade para o diagnóstico informado, um por linha separado por \\n, sem bullets nem numeração",
  "desempenho": "parágrafo genérico de acompanhamento sem afirmar avanços específicos não documentados, recomendando continuidade"
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
        temperature: 0.3,
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