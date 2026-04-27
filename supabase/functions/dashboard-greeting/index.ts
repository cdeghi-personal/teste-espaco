// Supabase Edge Function — dashboard-greeting
// Gera uma mensagem de abertura personalizada para o dashboard.
// A categoria é sorteada no frontend para garantir variedade entre usuários no mesmo dia.
// JWT Verification deve estar DESATIVADO.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const instrucaoPorCategoria = {
  efemeride:    `Mencione UMA efeméride histórica real e verificável que ocorreu nesta data (${'{date}'}) em qualquer ano. Pode ser um evento histórico, uma invenção, uma conquista esportiva, um lançamento cultural marcante. Se não tiver certeza de nenhum fato real para esta data, mude para uma mensagem motivacional.`,
  santo:        `Mencione o santo ou santa do dia no calendário católico brasileiro para a data ${'{date}'}. Diga o nome e um detalhe breve e simpático sobre ele/ela.`,
  aniversario:  `Mencione o aniversário de UMA personalidade famosa e reconhecida internacionalmente ou no Brasil que nasceu nesta data (${'{date}'}) — pode ser artista, cientista, esportista, escritor etc. Cite o nome e por que é lembrado. Use apenas fatos que você tem certeza.`,
  comemorativa: `Mencione uma data ou semana comemorativa associada ao dia ${'{date}'} (ex: Dia do Trabalho, Dia das Mães, Dia Mundial da Saúde Mental etc.). Se não houver uma óbvia, mencione uma curiosidade cultural ou folclórica do período.`,
  motivacional: `Escreva uma mensagem motivacional calorosa e pessoal para alguém que dedica o dia a cuidar de crianças com necessidades especiais. Deve ser genuína, não genérica.`,
  pessoal:      `Faça UMA pergunta amigável, descontraída e pessoal sobre o dia a dia — algo que uma pessoa próxima perguntaria (ex: sobre o café da manhã, uma caminhada, uma boa noite de sono, um pequeno prazer do dia). Não fale de trabalho.`,
  bemEstar:     `Compartilhe uma dica rápida e prática de bem-estar ou autocuidado, voltada para profissionais de saúde que costumam esquecer de cuidar de si mesmos. Seja específico e humano, não genérico.`,
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