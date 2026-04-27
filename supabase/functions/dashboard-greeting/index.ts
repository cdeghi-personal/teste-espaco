// Supabase Edge Function — dashboard-greeting
// Gera uma mensagem de abertura personalizada para o dashboard.
// A categoria é sorteada no frontend para garantir variedade entre usuários no mesmo dia.
// JWT Verification deve estar DESATIVADO.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// IMPORTANTE: categorias que dependem de datas específicas foram REMOVIDAS ou convertidas
// para curiosidades gerais, pois LLMs não são confiáveis para afirmar que algo aconteceu
// em um dia exato — tendem a confabular datas.
const instrucaoPorCategoria = {
  motivacional: `Escreva uma mensagem motivacional calorosa e genuína para alguém que dedica o dia a cuidar de crianças com necessidades especiais. Sem clichê — seja específico e humano.`,
  pessoal:      `Faça UMA pergunta amigável e descontraída sobre o dia a dia — algo que uma pessoa próxima perguntaria (sobre o café da manhã, um passeio, uma boa noite de sono, um pequeno prazer do dia). Nada de trabalho.`,
  bemEstar:     `Compartilhe uma dica prática e específica de bem-estar ou autocuidado voltada a profissionais de saúde que costumam esquecer de cuidar de si. Seja concreto, não genérico.`,
  geografia:    `Compartilhe UMA curiosidade geográfica surpreendente e pouco conhecida — capital inusitada, rio ou montanha impressionante, fenômeno geográfico, fato sobre algum país. Termine com uma pergunta leve ao usuário.`,
  cinema:       `Compartilhe UMA curiosidade fascinante sobre um filme clássico ou muito amado — pode ser sobre os bastidores, o elenco, uma cena icônica ou o impacto cultural. NÃO diga que aconteceu hoje nem mencione nenhuma data específica. Termine com uma pergunta convidativa para o usuário.`,
  musica:       `Compartilhe UMA curiosidade interessante sobre um álbum icônico ou artista musical muito famoso — algo pouco conhecido pelo público em geral. NÃO diga que aconteceu hoje nem mencione nenhuma data específica. Termine com uma sugestão para o usuário ouvir algo.`,
  tecnologia:   `Compartilhe UMA curiosidade fascinante sobre uma invenção, tecnologia ou inovação que mudou o mundo — pode ser a história de como surgiu, um detalhe curioso, ou um fato surpreendente. NÃO diga que aconteceu hoje nem mencione nenhuma data específica.`,
  historia:     `Compartilhe UM fato histórico curioso e pouco conhecido — pode ser sobre qualquer época e qualquer lugar do mundo. Algo genuinamente surpreendente. NÃO diga que aconteceu hoje nem mencione nenhuma data específica.`,
  ciencia:      `Compartilhe UMA curiosidade científica fascinante — sobre o universo, o corpo humano, animais, física, biologia, qualquer área. Algo que cause aquele "nossa, não sabia disso!". NÃO mencione nenhuma data específica.`,
  gastronomia:  `Compartilhe UMA curiosidade divertida sobre alguma comida, bebida ou tradição gastronômica — pode ser a origem de um prato famoso, um fato surpreendente sobre um ingrediente, ou um costume alimentar inusitado de algum país. Termine com uma pergunta leve.`,
}

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

    const { date, hour, userName, categoria } = await req.json()

    const periodo = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

    const instrucaoBase = instrucaoPorCategoria[categoria] ?? instrucaoPorCategoria['motivacional']
    const instrucao = instrucaoBase.replaceAll('{date}', date)

    const systemPrompt = `Você é um assistente simpático do Espaço Casa Amarela, uma clínica de terapias infantis no Brasil.

Gere UMA mensagem de abertura de dashboard para o usuário "${userName}".

A mensagem DEVE:
1. Começar com "${periodo}, ${userName}!"
2. Ter UMA frase adicional seguindo esta instrução específica: ${instrucao}

REGRAS:
- Máximo de 2 frases no total (o cumprimento + a frase adicional)
- Tom caloroso, humano e natural — nunca corporativo ou genérico
- Português brasileiro informal
- Inclua UM emoji adequado ao tema no final
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
          { role: 'user', content: `Data: ${date}, hora: ${hour}h.` },
        ],
        temperature: 0.85,
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

    return new Response(JSON.stringify({ message, categoria }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})