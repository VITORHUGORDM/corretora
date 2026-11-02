(function () {
  "use strict";
  var S = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "text") n.textContent = props[k];
      else if (k === "class") n.className = props[k];
      else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function wa(msg) {
    return "https://wa.me/" + S.whatsapp + "?text=" + encodeURIComponent(msg || "");
  }
  function store(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    return null;
  }

  /* ---------- Dados do site ---------- */
  document.title = S.nome + " — " + S.slogan;
  $$("[data-s]").forEach(function (n) { n.textContent = S[n.getAttribute("data-s")] || ""; });
  $$("[data-wa]").forEach(function (a) { a.href = wa(a.getAttribute("data-wa")); a.target = "_blank"; a.rel = "noopener"; });
  $$("[data-mail]").forEach(function (a) { a.href = "mailto:" + S.email; });
  $$("[data-insta]").forEach(function (a) { a.href = S.instagram; });
  $("#ano").textContent = new Date().getFullYear();

  // WhatsApp FAB icon (simples)
  var fab = $(".fab"); fab.textContent = "💬"; fab.style.fontSize = "1.7rem";

  /* ---------- Menu mobile ---------- */
  var burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }); });

  /* ---------- Estatísticas ---------- */
  var statsEl = $("#stats");
  S.numeros.forEach(function (n) {
    var strong = el("strong", { text: "0" + n.sufixo });
    strong.dataset.to = n.valor; strong.dataset.suf = n.sufixo;
    statsEl.appendChild(el("div", { class: "stat reveal" }, [strong, el("span", { text: n.rotulo })]));
  });
  function countUp(node) {
    var to = +node.dataset.to, suf = node.dataset.suf, t0 = performance.now(), dur = 1400;
    (function tick(t) {
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(to * e) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- Ilustração (quando não há foto) ---------- */
  function art(im) {
    if (im.img) {
      var i = el("img", { src: im.img, alt: im.titulo, loading: "lazy" });
      return i;
    }
    var c = im.cores || ["#7c3aed", "#ff4d6d"], ns = "http://www.w3.org/2000/svg", id = "g" + im.id;
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 400 300"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Ilustração: " + im.titulo);
    var shapes;
    if (im.tipo === "Apartamento" || im.tipo === "Comercial") {
      shapes = '<rect x="120" y="70" width="110" height="230" fill="#fff" opacity=".92"/><rect x="230" y="120" width="70" height="180" fill="#fff" opacity=".7"/>' +
        [0, 1, 2, 3, 4].map(function (r) { return '<rect x="136" y="' + (88 + r * 40) + '" width="22" height="22" fill="' + c[0] + '"/><rect x="170" y="' + (88 + r * 40) + '" width="22" height="22" fill="' + c[1] + '"/><rect x="198" y="' + (88 + r * 40) + '" width="18" height="22" fill="' + c[0] + '"/>'; }).join("");
    } else if (im.tipo === "Terreno") {
      shapes = '<path d="M0 230 Q100 190 200 220 T400 210 V300 H0Z" fill="#fff" opacity=".85"/><path d="M0 260 Q120 230 240 255 T400 250 V300 H0Z" fill="#fff" opacity=".6"/><rect x="290" y="150" width="6" height="70" fill="#fff"/><path d="M293 150h60l-12 18 12 18h-60z" fill="#ffd23f"/>';
    } else {
      shapes = '<path d="M90 160 200 70l110 90v140H90z" fill="#fff" opacity=".93"/><path d="M70 165 200 55l130 110-10 12L200 78 80 177z" fill="#ffd23f"/><rect x="175" y="200" width="50" height="100" rx="4" fill="' + c[0] + '"/><rect x="110" y="190" width="40" height="40" fill="' + c[1] + '"/><rect x="250" y="190" width="40" height="40" fill="' + c[1] + '"/>';
    }
    svg.innerHTML = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#' + id + ')"/><circle cx="330" cy="62" r="34" fill="#ffd23f" opacity=".9"/>' + shapes;
    return svg;
  }

  /* ---------- Filtros / vitrine ---------- */
  var grid = $("#grid"), empty = $("#empty"), info = $("#resultInfo");
  var favs = store("favs") || [];
  var quick = "";

  function fillSelect(sel, vals) { vals.forEach(function (v) { sel.appendChild(el("option", { text: v, value: v })); }); }
  function uniq(k) { return S.imoveis.map(function (i) { return i[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(); }
  fillSelect($("#fTipo"), uniq("tipo"));
  fillSelect($("#fBairro"), uniq("bairro"));

  function filtered() {
    var fin = $("#fFinalidade").value || (quick === "Venda" || quick === "Aluguel" ? quick : "");
    var tipo = $("#fTipo").value, bairro = $("#fBairro").value, q = +$("#fQuartos").value;
    var list = S.imoveis.filter(function (i) {
      return (!fin || i.finalidade === fin) && (!tipo || i.tipo === tipo) && (!bairro || i.bairro === bairro) &&
        i.quartos >= q && (quick !== "fav" || favs.indexOf(i.id) > -1);
    });
    var o = $("#fOrdem").value;
    list.sort(function (a, b) {
      if (o === "menor") return a.preco - b.preco;
      if (o === "maior") return b.preco - a.preco;
      if (o === "area") return b.area - a.area;
      return (b.destaque - a.destaque) || (a.id - b.id);
    });
    return list;
  }

  function priceHtml(i) {
    var p = el("p", { class: "price", text: brl.format(i.preco) });
    if (i.finalidade === "Aluguel") p.appendChild(el("small", { text: " /mês" }));
    return p;
  }
  function metaItems(i) {
    var m = [];
    if (i.quartos) m.push("🛏 " + i.quartos + (i.quartos > 1 ? " quartos" : " quarto"));
    if (i.banheiros) m.push("🚿 " + i.banheiros);
    if (i.vagas) m.push("🚗 " + i.vagas);
    m.push("📐 " + i.area + " m²");
    return m;
  }

  function render() {
    var list = filtered();
    grid.textContent = "";
    list.forEach(function (i) {
      var favBtn = el("button", { class: "fav", type: "button", "aria-label": "Favoritar " + i.titulo, "aria-pressed": favs.indexOf(i.id) > -1, text: "❤" });
      favBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var k = favs.indexOf(i.id);
        if (k > -1) favs.splice(k, 1); else favs.push(i.id);
        store("favs", favs);
        if (quick === "fav") render(); else favBtn.setAttribute("aria-pressed", favs.indexOf(i.id) > -1);
      });
      var artBox = el("div", { class: "imv__art" }, [art(i), el("span", { class: "badge", text: i.finalidade })]);
      if (i.destaque) artBox.appendChild(el("span", { class: "badge badge--hot", text: "🔥 Destaque" }));
      artBox.appendChild(favBtn);
      var card = el("div", { class: "imv reveal in", role: "button", tabindex: "0" }, [
        artBox,
        el("div", { class: "imv__body" }, [
          el("small", { text: i.tipo + " · " + i.bairro }),
          el("h3", { text: i.titulo }),
          priceHtml(i),
          el("div", { class: "meta" }, metaItems(i).map(function (t) { return el("span", { text: t }); }))
        ])
      ]);
      card.addEventListener("click", function () { openModal(i); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(i); } });
      grid.appendChild(card);
    });
    empty.hidden = list.length > 0;
    info.textContent = list.length + (list.length === 1 ? " imóvel encontrado" : " imóveis encontrados");
  }

  $("#searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    quick = ""; syncChips();
    render();
    $("#imoveis").scrollIntoView({ behavior: "smooth" });
  });
  $("#fOrdem").addEventListener("change", render);
  function syncChips() { $$(".chip").forEach(function (c) { c.classList.toggle("is-on", c.dataset.quick === quick); }); }
  $$(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      quick = c.dataset.quick; syncChips();
      $("#fFinalidade").value = (quick === "Venda" || quick === "Aluguel") ? quick : "";
      render();
    });
  });
  $("#clear").addEventListener("click", function () {
    quick = ""; syncChips();
    ["fFinalidade", "fTipo", "fBairro"].forEach(function (id) { $("#" + id).value = ""; });
    $("#fQuartos").value = "0"; render();
  });

  /* ---------- Modal ---------- */
  var modal = $("#modal");
  function openModal(i) {
    var a = $("#mArt"); a.textContent = ""; a.appendChild(art(i));
    $("#mTag").textContent = i.finalidade + " · " + i.tipo + " · " + i.bairro;
    $("#mTitulo").textContent = i.titulo;
    var p = $("#mPreco"); p.textContent = brl.format(i.preco);
    if (i.finalidade === "Aluguel") p.appendChild(el("small", { text: " /mês" }));
    var f = $("#mFeat"); f.textContent = "";
    metaItems(i).forEach(function (t) { f.appendChild(el("li", { text: t })); });
    $("#mDesc").textContent = i.descricao || "";
    var w = $("#mWa"); w.href = wa("Olá! Tenho interesse no imóvel: " + i.titulo + " (" + i.bairro + ") — " + brl.format(i.preco) + ". Podemos conversar?");
    w.target = "_blank"; w.rel = "noopener";
    if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
  }
  modal.addEventListener("click", function (e) { if (e.target === modal) modal.close(); });

  /* ---------- Simulador (Tabela Price) ---------- */
  var sV = $("#sValor"), sE = $("#sEntrada"), sP = $("#sPrazo"), sT = $("#sTaxa");
  function sim() {
    var valor = +sV.value, ent = +sE.value, anos = +sP.value, taxa = +sT.value;
    var financiado = valor * (1 - ent / 100), n = anos * 12, i = Math.pow(1 + taxa / 100, 1 / 12) - 1;
    var parcela = financiado * i / (1 - Math.pow(1 + i, -n));
    $("#oValor").textContent = brl.format(valor);
    $("#oEntrada").textContent = ent + "% (" + brl.format(valor * ent / 100) + ")";
    $("#oPrazo").textContent = anos + " anos (" + n + " meses)";
    $("#oTaxa").textContent = taxa.toFixed(1).replace(".", ",") + "% a.a.";
    $("#rParcela").textContent = brl.format(parcela) + " /mês";
    $("#rResumo").textContent = "Financiado: " + brl.format(financiado) + " · Total pago ≈ " + brl.format(parcela * n);
    var w = $("#simWa");
    w.href = wa("Olá! Fiz uma simulação: imóvel de " + brl.format(valor) + ", entrada de " + ent + "%, " + anos + " anos. Parcela estimada: " + brl.format(parcela) + ". Quero uma simulação oficial.");
    w.target = "_blank"; w.rel = "noopener";
  }
  [sV, sE, sP, sT].forEach(function (s) { s.addEventListener("input", sim); });
  sim();

  /* ---------- Avaliação ---------- */
  $("#avalForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(e.target);
    var msg = "Olá! Me chamo " + d.get("nome") + " e quero avaliar meu imóvel.\n" +
      "Tipo: " + d.get("tipo") + "\nBairro: " + d.get("bairro") +
      (d.get("area") ? "\nÁrea: " + d.get("area") + " m²" : "") +
      (d.get("quartos") ? "\nQuartos: " + d.get("quartos") : "");
    window.open(wa(msg), "_blank", "noopener");
  });

  /* ---------- Depoimentos e FAQ ---------- */
  var q = $("#quotes");
  S.depoimentos.forEach(function (d) {
    q.appendChild(el("blockquote", { class: "quote reveal" }, [
      el("p", { text: d.texto }),
      el("footer", {}, [el("b", { text: d.nome }), d.detalhe])
    ]));
  });
  var faq = $("#faq");
  S.faq.forEach(function (f) {
    faq.appendChild(el("details", { class: "reveal" }, [el("summary", { text: f.p }), el("p", { text: f.r })]));
  });

  /* ---------- Animações de entrada ---------- */
  render();
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      var s = $("strong[data-to]", en.target); if (s) countUp(s);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 }) : null;
  $$(".reveal:not(.in)").forEach(function (n) {
    if (io) io.observe(n); else { n.classList.add("in"); var s = $("strong[data-to]", n); if (s) countUp(s); }
  });
})();
