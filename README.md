# Landing page 3D da corretora

Landing page imobiliária com um **cenário 3D interativo em Three.js**: um prédio de apartamentos sendo
construído à noite, em visão de drone, com contornos de neon estilo planta (lote, grade e medidas).

## O que tem
- **Construção animada:** o lote é traçado em neon, a estrutura "holográfica" sobe andar por andar, o prédio
  se preenche, as janelas acendem e o guindaste trabalha. Botão **↻ Reconstruir** repete a animação.
- **Modo Planta:** alterna o prédio para o holograma de neon (wireframe).
- **Escolha seu andar:** o andar selecionado brilha no prédio 3D, a câmera acompanha e o preço/WhatsApp mudam.
- **Câmera guiada pelo scroll** + **Explorar em 3D** com controles de órbita (arrastar, zoom, pinça) e pontos clicáveis.
- Detalhes vivos: caminhões na estrada, drones, poeira de luz, pulsos no chão, varredura de luz no prédio.
- Vitrine de imóveis, simulador de financiamento (Price) e avaliação gratuita, todos com atalho para o WhatsApp.
- **Desempenho:** instanciamento, sombras atualizadas a cada 2 quadros, MSAA + brilho (bloom), e resolução adaptativa
  (reduz sozinha, e desliga o brilho se necessário, caso caia de 60fps). Adicione `?fps` na URL para ver o contador.
- Sem WebGL o site continua funcionando (fundo em degradê). Respeita `prefers-reduced-motion`.

## Como usar
Abra `index.html` (ou hospede a pasta em qualquer lugar: GitHub Pages, Netlify, Vercel, Hostinger...).
O arquivo `js/scene.js` já está compilado, então não precisa instalar nada para publicar.

## Personalizar
Edite **apenas `js/config.js`**: nome, CRECI, WhatsApp, contatos, **dados do empreendimento** (andares, preço,
metragem, entrega), imóveis, depoimentos e números. Tudo marcado como `EXEMPLO` é demonstração.
Para fotos reais nos cards, coloque em `img/` e preencha `img: "img/casa1.jpg"`.

## Alterar o cenário 3D
O código-fonte está em `src/scene.js`. Depois de editar:
```bash
npm install
npm run build   # gera js/scene.js
```
Os modelos (prédio, guindaste, caminhões, árvores) são **gerados por código** em estilo low-poly, sem arquivos de modelo.
Para usar um modelo feito no Blender, exporte em `.glb` e carregue com `GLTFLoader` em `src/scene.js`.
