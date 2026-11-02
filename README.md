# Landing page 3D da corretora

Landing page imobiliária com um **cenário 3D interativo em Three.js**: um riacho aconchegante com uma casinha,
ponte, árvores, pedras e flores. A câmera percorre o cenário conforme você rola a página.

## O que tem
- **Água com shader de fluxo** (correnteza animada, reflexo do céu, brilho do sol, espuma e folhas flutuando).
- **Vento suave** na grama, flores e árvores (vertex shader em instâncias).
- **Iluminação ambiente + sombras suaves** (PCF soft). Modos **Dia, Entardecer e Noite** (janelas acesas, vaga-lumes, estrelas).
- **Controles de órbita**: botão "Explorar o cenário 3D" (arrastar, zoom, pinça) com pontos clicáveis que levam às seções.
- **Desempenho:** instanciamento (≈37 draw calls), sombras atualizadas a cada 2 quadros, resolução adaptativa
  (reduz sozinha se cair de 60fps). Adicione `?fps` na URL para ver o contador de quadros.
- Vitrine de imóveis, avaliação gratuita e simulador de financiamento, todos com atalho para o WhatsApp.
- Sem WebGL, o site continua funcionando (fundo em degradê). Respeita `prefers-reduced-motion`.

## Como usar
Abra `index.html` (ou hospede a pasta em qualquer lugar: GitHub Pages, Netlify, Vercel, Hostinger...).
O arquivo `js/scene.js` já está compilado, então não precisa instalar nada para publicar.

## Personalizar
Edite **apenas `js/config.js`**: nome, CRECI, WhatsApp, contatos, imóveis, depoimentos e números.
Tudo marcado como `EXEMPLO` é demonstração. Para fotos reais, coloque em `img/` e preencha `img: "img/casa1.jpg"`.

## Alterar o cenário 3D
O código-fonte está em `src/scene.js`. Depois de editar:
```bash
npm install
npm run build   # gera js/scene.js
```
Os modelos (casa, árvores, pedras, ponte, grama) são **gerados por código em estilo low-poly**, sem arquivos de modelo.
Para usar modelos feitos no Blender, exporte em `.glb` e carregue com `GLTFLoader` em `src/scene.js`.
