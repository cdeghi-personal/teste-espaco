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
  efemeride:    `Mencione UMA efeméride histórica real e verificável que ocorreu nesta data ({date}) em qualquer ano — evento histórico, invenção, conquista esportiva ou lançamento cultural. Se não lembrar de nenhum fato seguro para esta data, escreva uma mensagem motivacional no lugar.`,
  santo:        `Mencione o santo ou santa do dia no calendário católico brasileiro para a data {date}. Diga o nome e um detalhe breve e simpático sobre ele/ela.`,
  aniversario:  `Mencione o aniversário de UMA personalidade muito famosa (artista, cientista, esportista, escritor) nascida nesta data ({date}). Cite o nome e por que é lembrado. Só use fatos que você tem certeza.`,
  comemorativa: `Mencione uma data comemorativa ou semana temática associada ao dia {date} (ex: Dia do Trabalho, Dia Mundial da Saúde Mental, Dia das Crianças). Se não houver uma clara, mencione uma curiosidade folclórica ou cultural deste período do ano.`,
  motivacional: `Escreva uma mensagem motivacional calorosa e genuína para alguém que dedica o dia a cuidar de crianças com necessidades especiais. Sem clichê — seja específico e humano.`,
  pessoal:      `Faça UMA pergunta amigável e descontraída sobre o dia a dia — algo que uma pessoa próxima perguntaria (ex: sobre o café da manhã, um passeio, uma boa noite de sono, um pequeno prazer do dia). Nada de trabalho.`,
  bemEstar:     `Compartilhe uma dica prática e específica de bem-estar ou autocuidado voltada a profissionais de saúde que costumam esquecer de cuidar de si. Seja concreto, não genérico.`,
  cinema:       `Mencione o aniversário de lançamento de UM filme clássico ou muito querido que estreou nesta data ({date}) em qualquer ano. Inclua o ano, o nome do diretor e uma frase convidativa para rever ou falar sobre ele. Só use fatos verificáveis — se não lembrar de nenhum filme para esta data, cite um fato curioso sobre cinema em geral.`,
  musica:       `Mencione o aniversário de um álbum icônico, música marcante ou evento musical histórico que aconteceu nesta data ({date}) em qualquer ano — lançamento de disco, show histórico, formação de banda. Só use fatos verificáveis — se não lembrar de nenhum para esta data, mencione uma curiosidade musical interessante.`,
  tecnologia:   `Mencione uma curiosidade ou efeméride do mundo da tecnologia relacionada a esta data ({date}) — criação de um dispositivo, lançamento de software, invenção de um protocolo, primeiro acesso à internet etc. Diga quantos anos atrás foi. Só use fatos verificáveis — se não lembrar de nenhum para esta data, mencione uma curiosidade tecnológica interessante.`,
  historia:     `Mencione um evento histórico marcante que aconteceu nesta data ({date}) em qualquer época — guerra, tratado, descoberta, independência, revolução. Diga quantos anos atrás foi. Use somente fatos verificáveis — se não lembrar de nenhum seguro para esta data, escolha um evento histórico notável de qualquer dia próximo.`,
  geografia:    `Compartilhe UMA curiosidade geográfica surpreendente e pouco conhecida — pode ser sobre uma capital inusitada, um rio ou montanha impressionante, um fenômeno geográfico, um fato sobre algum país ou cidade. Não precisa ser da data de hoje. Termine com uma pergunta leve ao usuário.`,
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