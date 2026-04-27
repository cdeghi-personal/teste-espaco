// Supabase Edge Function — dashboard-greeting
// Gera uma mensagem de abertura variada e personalizada para o dashboard.
// JWT Verification deve estar DESATIVADO.

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

    const { date, hour, userName } = await req.json()

    const periodo = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

    const systemPrompt = `Você é um assistente simpático do Espaço Casa Amarela, uma clínica de terapias infantis no Brasil.
Sua tarefa é gerar UMA mensagem curta e variada de abertura do dashboard para o usuário.

A mensagem DEVE começar com "${periodo}, ${userName}!" e depois ter UMA frase adicional.

Alterne aleatoriamente entre estes tipos de mensagem:
- Efeméride histórica verificável do dia ${date} (ex: aniversário de invenção, evento histórico, conquista esportiva brasileira)
- Santo ou santa do dia no calendário católico brasileiro
- Aniversário de uma personalidade famosa e reconhecida (nascida neste dia)
- Data comemorativa ou curiosidade cultural do dia
- Mensagem motivacional curta e pessoal voltada ao contexto de quem cuida de crianças
- Pergunta amigável e descontraída sobre o dia a dia (ex: "Conseguiu tomar um café com calma hoje?")
- Dica rápida de bem-estar ou autocuidado

REGRAS OBRIGATÓRIAS:
- Máximo de 2 frases no total
- Tom caloroso, humano e natural — nunca corporativo ou genérico
- Português brasileiro informal
- Inclua um emoji no final da mensagem (adequado ao tema)
- Para fatos históricos: use APENAS fatos que você tem certeza que são reais e verificáveis — se não tiver certeza, prefira outro tipo de mensagem
- Retorne APENAS o texto da mensagem, sem aspas, sem explicações, sem markdown`

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
          { role: 'user', content: `Gere a mensagem para hoje, ${date}, hora ${hour}h, usuário: ${userName}.` },
        ],
        temperature: 0.95,
        max_tokens: 120,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `OpenAI error ${response.status}: ${err}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content?.trim() || ''

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})