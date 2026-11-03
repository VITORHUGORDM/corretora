/* ==========================================================
   CONFIGURAÇÃO DO SITE — edite SOMENTE este arquivo para
   trocar nome, contatos, imóveis, depoimentos e números.
   Tudo marcado como "EXEMPLO" é conteúdo de demonstração.
   ========================================================== */
window.SITE = {
  nome: "Sua Corretora",                 // EXEMPLO: troque pelo nome real
  slogan: "Seu sonho começa aqui",
  creci: "CRECI 00000-J",                // EXEMPLO: troque pelo CRECI real
  whatsapp: "5500000000000",             // DDI + DDD + número, só dígitos
  telefoneExibicao: "(00) 00000-0000",
  endereco: "Rua Exemplo, 123 — Centro",
  cidade: "Sua Cidade — UF",
  instagram: "https://instagram.com/",   // link do perfil
  horario: "Seg a Sex, 9h às 18h · Sáb, 9h às 13h",


  // Empreendimento mostrado no cenário 3D (EXEMPLO — troque pelos dados reais)
  empreendimento: {
    nome: "Residencial Exemplo",
    andares: 8,          // de 4 a 14: define a altura do prédio 3D
    entrega: "Dez/2028"  // aparece na barra "Obra" do topo
  },

  // Números que aparecem na faixa de destaque (use os reais)
  numeros: [
    { valor: 500, sufixo: "+", rotulo: "Famílias atendidas" },
    { valor: 12, sufixo: "", rotulo: "Anos de mercado" },
    { valor: 98, sufixo: "%", rotulo: "Clientes satisfeitos" },
    { valor: 45, sufixo: "", rotulo: "Dias para vender, em média" }
  ],

  /* Galeria de fotos de referência. Para usar foto real, coloque o arquivo em /img
     e preencha "img": "img/sala.jpg". Sem foto, o site mostra um espaço ilustrado. */
  galeria: [
    { legenda: "Fachada do empreendimento", icone: "🏢", img: "", cores: ["#0b3a7a", "#35b6ff"] },
    { legenda: "Sala de estar integrada", icone: "🛋️", img: "", cores: ["#3b1d6e", "#7c5cff"] },
    { legenda: "Varanda gourmet", icone: "🌇", img: "", cores: ["#7a2a0b", "#ffb84d"] },
    { legenda: "Cozinha planejada", icone: "🍳", img: "", cores: ["#0b5a52", "#2de2c4"] },
    { legenda: "Suíte com closet", icone: "🛏️", img: "", cores: ["#5a0b3a", "#ff5ca8"] },
    { legenda: "Área de lazer e piscina", icone: "🏊", img: "", cores: ["#0b3a5a", "#3ddcff"] }
  ],

  // Depoimentos de clientes que compraram apartamento (EXEMPLO — troque por depoimentos reais, com autorização)
  depoimentos: [
    { nome: "Cliente Exemplo 1", detalhe: "Comprou o apartamento de 3 quartos", texto: "Acompanhei tudo pelo WhatsApp e o atendimento foi rápido e transparente do começo ao fim. Hoje moro no meu apê dos sonhos!" },
    { nome: "Cliente Exemplo 2", detalhe: "Realizou a compra do 1º imóvel", texto: "Eu tinha medo de financiar, mas o corretor me explicou cada etapa. Em poucas semanas eu estava com as chaves na mão." },
    { nome: "Cliente Exemplo 3", detalhe: "Comprou na planta e já mora", texto: "Escolhi o andar, visitei a obra e fechei com segurança. Recomendo demais a equipe!" }
  ]
};
