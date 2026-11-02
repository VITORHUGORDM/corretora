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

  /* Galeria de referência */
  var rail = $("#rail");
  (S.galeria || []).forEach(function (f) {
    var c = f.cores || ["#0b3a7a", "#35b6ff"], art;
    if (f.img) art = el("img", { src: f.img, alt: f.legenda || "Foto de referência", loading: "lazy" });
    else art = el("div", { class: "ph__ph", style: "background:linear-gradient(135deg," + c[0] + "," + c[1] + ")" }, [el("span", { text: f.icone || "🏠" }), el("small", { text: "Sua foto aqui" })]);
    rail.appendChild(el("figure", { class: "ph" }, [el("div", { class: "ph__art" }, [art]), el("figcaption", { text: f.legenda || "" })]));
  });

  /* Depoimentos */
  var quotes = $("#quotes");
  (S.depoimentos || []).forEach(function (d) {
    var ini = (d.nome || "?").split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase();
    quotes.appendChild(el("blockquote", { class: "quote" }, [
      el("div", { class: "stars", "aria-label": "5 estrelas", text: "★★★★★" }),
      el("p", { text: d.texto }),
      el("footer", {}, [el("span", { class: "av", text: ini }), el("div", {}, [el("b", { text: d.nome }), el("small", { text: d.detalhe })])])
    ]));
  });
})();
