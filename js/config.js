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
  email: "contato@seudominio.com.br",
  endereco: "Rua Exemplo, 123 — Centro",
  cidade: "Sua Cidade — UF",
  instagram: "https://instagram.com/",   // link do perfil
  horario: "Seg a Sex, 9h às 18h · Sáb, 9h às 13h",


  // Empreendimento mostrado no cenário 3D (EXEMPLO — troque pelos dados reais)
  empreendimento: {
    nome: "Residencial Exemplo",
    andares: 8,                              // de 4 a 14
    apPorAndar: 4,
    metragem: "2 e 3 quartos · 62 a 78 m²",
    precoBase: 380000,                       // preço do 1º andar
    incrementoAndar: 6000,                   // quanto sobe por andar
    entrega: "Dez/2028"
  },

  // Números que aparecem na faixa de destaque (use os reais)
  numeros: [
    { valor: 500, sufixo: "+", rotulo: "Famílias atendidas" },
    { valor: 12, sufixo: "", rotulo: "Anos de mercado" },
    { valor: 98, sufixo: "%", rotulo: "Clientes satisfeitos" },
    { valor: 45, sufixo: "", rotulo: "Dias para vender, em média" }
  ],

  /* Imóveis. Para usar foto real, coloque o arquivo em /img e preencha
     "img": "img/casa1.jpg". Sem foto, o site desenha uma ilustração. */
  imoveis: [
    { id: 1, titulo: "Casa moderna com piscina", tipo: "Casa", finalidade: "Venda", bairro: "Jardim das Flores", preco: 890000, quartos: 4, banheiros: 3, vagas: 3, area: 280, destaque: true, img: "", cores: ["#7c3aed", "#ff4d6d"], descricao: "Casa ampla com área gourmet, piscina e acabamento premium. (EXEMPLO)" },
    { id: 2, titulo: "Apartamento vista livre", tipo: "Apartamento", finalidade: "Venda", bairro: "Centro", preco: 520000, quartos: 3, banheiros: 2, vagas: 2, area: 105, destaque: true, img: "", cores: ["#00c2a8", "#3b82f6"], descricao: "Andar alto, sol da manhã e lazer completo no condomínio. (EXEMPLO)" },
    { id: 3, titulo: "Studio compacto e inteligente", tipo: "Apartamento", finalidade: "Aluguel", bairro: "Centro", preco: 1800, quartos: 1, banheiros: 1, vagas: 1, area: 38, destaque: false, img: "", cores: ["#ffb703", "#ff4d6d"], descricao: "Ideal para quem mora sozinho, perto de tudo. (EXEMPLO)" },
    { id: 4, titulo: "Sobrado em condomínio fechado", tipo: "Casa", finalidade: "Venda", bairro: "Vila Nova", preco: 740000, quartos: 3, banheiros: 3, vagas: 2, area: 190, destaque: false, img: "", cores: ["#3b82f6", "#7c3aed"], descricao: "Segurança 24h, área verde e playground. (EXEMPLO)" },
    { id: 5, titulo: "Terreno pronto para construir", tipo: "Terreno", finalidade: "Venda", bairro: "Jardim das Flores", preco: 260000, quartos: 0, banheiros: 0, vagas: 0, area: 450, destaque: false, img: "", cores: ["#22c55e", "#00c2a8"], descricao: "Plano, documentação em dia e ótima localização. (EXEMPLO)" },
    { id: 6, titulo: "Casa térrea para família", tipo: "Casa", finalidade: "Aluguel", bairro: "Vila Nova", preco: 3200, quartos: 3, banheiros: 2, vagas: 2, area: 150, destaque: false, img: "", cores: ["#ff4d6d", "#ffb703"], descricao: "Quintal grande e cozinha planejada. (EXEMPLO)" },
    { id: 7, titulo: "Cobertura duplex", tipo: "Apartamento", finalidade: "Venda", bairro: "Alto da Serra", preco: 1250000, quartos: 4, banheiros: 4, vagas: 3, area: 240, destaque: true, img: "", cores: ["#111827", "#7c3aed"], descricao: "Terraço com churrasqueira e vista panorâmica. (EXEMPLO)" },
    { id: 8, titulo: "Sala comercial no centro", tipo: "Comercial", finalidade: "Aluguel", bairro: "Centro", preco: 2500, quartos: 0, banheiros: 1, vagas: 1, area: 60, destaque: false, img: "", cores: ["#0ea5e9", "#22c55e"], descricao: "Térrea, com vitrine e fluxo de pessoas. (EXEMPLO)" }
  ],

  // Depoimentos (EXEMPLO — troque por depoimentos reais com autorização)
  depoimentos: [
    { nome: "Cliente Exemplo 1", detalhe: "Comprou a casa própria", texto: "Atendimento rápido e transparente do começo ao fim. Em poucas semanas estávamos com as chaves na mão!" },
    { nome: "Cliente Exemplo 2", detalhe: "Vendeu o apartamento", texto: "Avaliaram certinho e venderam bem antes do prazo que eu imaginava. Recomendo demais." },
    { nome: "Cliente Exemplo 3", detalhe: "Alugou o primeiro imóvel", texto: "Me ajudaram com toda a documentação e tiraram todas as minhas dúvidas pelo WhatsApp." }
  ],

  faq: [
    { p: "Quais documentos preciso para comprar um imóvel?", r: "Em geral: documentos pessoais (RG/CNH e CPF), comprovante de renda e de residência, e certidão de estado civil. Nossa equipe confere tudo com você e orienta cada etapa." },
    { p: "Vocês ajudam com financiamento?", r: "Sim. Fazemos a simulação, apoiamos na análise de crédito e acompanhamos o processo até a assinatura do contrato." },
    { p: "Quanto custa para anunciar meu imóvel?", r: "A avaliação é gratuita. A comissão só é cobrada quando o negócio é fechado. Fale com a gente para conhecer as condições." },
    { p: "Quanto tempo leva para vender?", r: "Depende do preço, da localização e do estado do imóvel. Com avaliação correta e boas fotos, o prazo costuma cair bastante." }
  ]
};
