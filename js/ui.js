(function () {
  "use strict";
  var S = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "text") n.textContent = props[k]; else if (k === "class") n.className = props[k]; else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function wa(msg) { return "https://wa.me/" + S.whatsapp + "?text=" + encodeURIComponent(msg || ""); }

  /* Dados do site */
  document.title = S.nome + " — " + S.slogan;
  $$("[data-s]").forEach(function (n) { n.textContent = S[n.getAttribute("data-s")] || ""; });
  $$("[data-wa]").forEach(function (a) { a.href = wa(a.getAttribute("data-wa")); a.target = "_blank"; a.rel = "noopener"; });
  $$("[data-mail]").forEach(function (a) { a.href = "mailto:" + S.email; });
  $$("[data-insta]").forEach(function (a) { a.href = S.instagram; });
  $("#ano").textContent = new Date().getFullYear();

  /* Menu mobile */
  var burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", function () { var o = nav.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }); });

  /* Números animados */
  var stats = $("#stats");
  S.numeros.forEach(function (n) {
    var b = el("b", { text: "0" + n.sufixo });
    stats.appendChild(el("li", {}, [b, el("span", { text: n.rotulo })]));
    var t0 = performance.now() + 500, dur = 1600;
    (function tick(t) {
      var p = Math.min(Math.max((t - t0) / dur, 0), 1), e = 1 - Math.pow(1 - p, 3);
      b.textContent = Math.round(n.valor * e) + n.sufixo;
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  });

  /* Vitrine */
  var icons = { Casa: "🏡", Apartamento: "🏢", Terreno: "🌳", Comercial: "🏬" };
  var rail = $("#rail"), filtro = "";
  function render() {
    rail.textContent = "";
    S.imoveis.filter(function (i) { return !filtro || i.finalidade === filtro; }).sort(function (a, b) { return (b.destaque - a.destaque) || (a.id - b.id); }).forEach(function (i) {
      var c = i.cores || ["#4f9a3d", "#ffb84d"];
      var price = el("p", { class: "price", text: brl.format(i.preco) });
      if (i.finalidade === "Aluguel") price.appendChild(el("small", { text: " /mês" }));
      var meta = [];
      if (i.quartos) meta.push("🛏 " + i.quartos);
      if (i.banheiros) meta.push("🚿 " + i.banheiros);
      if (i.vagas) meta.push("🚗 " + i.vagas);
      meta.push("📐 " + i.area + " m²");
      var art = el("div", { class: "imv__art", style: "background:linear-gradient(135deg," + c[0] + "," + c[1] + ")" }, [el("span", { class: "badge", text: i.finalidade + (i.destaque ? " · 🔥" : "") }), icons[i.tipo] || "🏠"]);
      if (i.img) { art.style.background = "url('" + encodeURI(i.img) + "') center/cover"; art.lastChild.textContent = ""; }
      var btn = el("a", { class: "btn btn--wa btn--sm", href: wa("Olá! Tenho interesse no imóvel: " + i.titulo + " (" + i.bairro + ") — " + brl.format(i.preco) + ". Podemos conversar?"), target: "_blank", rel: "noopener", text: "Quero visitar" });
      rail.appendChild(el("article", { class: "imv" }, [art, el("div", { class: "imv__body" }, [el("small", { text: i.tipo + " · " + i.bairro }), el("h3", { text: i.titulo }), price, el("div", { class: "meta" }, meta.map(function (m) { return el("span", { text: m }); })), btn])]));
    });
  }
  $$(".chip").forEach(function (c) {
    c.addEventListener("click", function () { filtro = c.dataset.f; $$(".chip").forEach(function (x) { x.classList.toggle("is-on", x === c); }); render(); });
  });
  render();

  /* Simulador (Tabela Price) */
  var sV = $("#sValor"), sE = $("#sEntrada"), sP = $("#sPrazo"), sT = $("#sTaxa");
  function sim() {
    var valor = +sV.value, ent = +sE.value, anos = +sP.value, taxa = +sT.value;
    var fin = valor * (1 - ent / 100), n = anos * 12, i = Math.pow(1 + taxa / 100, 1 / 12) - 1;
    var parcela = fin * i / (1 - Math.pow(1 + i, -n));
    $("#oValor").textContent = brl.format(valor);
    $("#oEntrada").textContent = ent + "% (" + brl.format(valor * ent / 100) + ")";
    $("#oPrazo").textContent = anos + " anos";
    $("#oTaxa").textContent = taxa.toFixed(1).replace(".", ",") + "% a.a.";
    $("#rParcela").textContent = brl.format(parcela) + " /mês";
    $("#rResumo").textContent = "Financiado: " + brl.format(fin) + " · Total ≈ " + brl.format(parcela * n);
    var w = $("#simWa");
    w.href = wa("Olá! Fiz uma simulação: imóvel de " + brl.format(valor) + ", entrada de " + ent + "%, " + anos + " anos. Parcela estimada: " + brl.format(parcela) + ". Quero uma simulação oficial.");
    w.target = "_blank"; w.rel = "noopener";
  }
  [sV, sE, sP, sT].forEach(function (s) { s.addEventListener("input", sim); });
  sim();

  /* Avaliação → WhatsApp */
  $("#avalForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(e.target);
    var msg = "Olá! Me chamo " + d.get("nome") + " e quero avaliar meu imóvel.\nTipo: " + d.get("tipo") + "\nBairro: " + d.get("bairro") + (d.get("area") ? "\nÁrea: " + d.get("area") + " m²" : "");
    window.open(wa(msg), "_blank", "noopener");
  });
})();
