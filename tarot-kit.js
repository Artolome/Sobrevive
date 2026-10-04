/* Tarot kit — gabarit de carte partagé par le jeu et par les planches de contrôle.
   Fonctionne dans Node (module.exports) et dans le navigateur (window.TarotKit). */
(function (root) {
  const PAL = { ink: "#1f1a17", paper: "#f1e6cc", rojo: "#c4432e", azul: "#2c5a9a", celeste: "#86b3d4", amarillo: "#dfa92c", verde: "#4c8748", carne: "#e7b78a", tostado: "#c98f62", marron: "#8b5a3c", gris: "#b3ada0", blanco: "#fbf6ea" };
  const CSS = `
.tarot{--w:200px;width:var(--w);height:calc(var(--w)*1.62);flex:none;position:relative;box-sizing:border-box;
  background-color:#f1e6cc;background-image:radial-gradient(rgba(120,85,35,.11) 1px,transparent 1.3px);background-size:5px 5px;
  border-radius:calc(var(--w)*.055);padding:calc(var(--w)*.035);color:#1f1a17;display:flex;flex-direction:column;
  box-shadow:0 calc(var(--w)*.03) calc(var(--w)*.09) rgba(0,0,0,.45),inset 0 0 calc(var(--w)*.15) rgba(150,105,45,.30)}
.tarot *{box-sizing:border-box}
.tarot .t-in{flex:1;min-height:0;display:flex;flex-direction:column;border:calc(var(--w)*.012) solid #1f1a17;border-radius:calc(var(--w)*.025);overflow:hidden}
.tarot .t-num{height:calc(var(--w)*.13);flex:none;display:flex;align-items:center;justify-content:center;gap:calc(var(--w)*.05);
  font-family:"IM Fell English SC",Georgia,serif;font-size:calc(var(--w)*.085);letter-spacing:.12em;line-height:1;
  border-bottom:calc(var(--w)*.012) solid #1f1a17}
.tarot .t-num::before,.tarot .t-num::after{content:"";width:calc(var(--w)*.032);height:calc(var(--w)*.032);background:#c4432e;transform:rotate(45deg);border:calc(var(--w)*.006) solid #1f1a17}
.tarot .t-ill{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.tarot .t-ill svg{width:100%;height:100%;display:block}
.tarot .t-ill img{width:100%;height:100%;display:block;object-fit:cover;pointer-events:none;user-select:none}
.tarot .t-ill .t-emoji{font-size:calc(var(--w)*.42);line-height:1}
.tarot .t-name{min-height:calc(var(--w)*.2);flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;
  border-top:calc(var(--w)*.012) solid #1f1a17;padding:calc(var(--w)*.02) calc(var(--w)*.03);text-align:center;gap:calc(var(--w)*.008)}
.tarot .t-name b{font-family:"IM Fell English SC",Georgia,serif;font-weight:400;font-size:calc(var(--w)*.088);letter-spacing:.05em;line-height:1.02;text-wrap:balance}
.tarot .t-name i{font-family:"Alegreya",Georgia,serif;font-size:calc(var(--w)*.062);line-height:1.1;opacity:.82;text-wrap:balance}
.tarot.back{background-color:#2c5a9a;background-image:none;box-shadow:0 calc(var(--w)*.03) calc(var(--w)*.09) rgba(0,0,0,.45)}
.tarot.back .t-in{border-color:#dfa92c;align-items:center;justify-content:center;
  background-color:#274f88;
  background-image:linear-gradient(45deg,transparent 45%,rgba(223,169,44,.85) 45% 55%,transparent 55%),linear-gradient(-45deg,transparent 45%,rgba(223,169,44,.85) 45% 55%,transparent 55%);
  background-size:calc(var(--w)*.16) calc(var(--w)*.16);background-position:center}
.tarot.back .t-sun{width:46%;aspect-ratio:1;border-radius:50%;background:#c4432e;border:calc(var(--w)*.014) solid #dfa92c;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 calc(var(--w)*.03) #274f88}
.tarot.back .t-sun svg{width:78%;height:78%}
.tarot.locked .t-ill svg,.tarot.unknown .t-ill svg,.tarot.locked .t-ill img,.tarot.unknown .t-ill img,.tarot.unknown .t-ill .t-emoji{filter:brightness(0);opacity:.2}
`;
  const SUN = `<svg viewBox="0 0 48 48"><g fill="#dfa92c" stroke="#1f1a17" stroke-width="1.6" stroke-linejoin="round"><path d="M24 2l3 9h-6zM24 46l3-9h-6zM2 24l9-3v6zM46 24l-9-3v6zM8.4 8.4l8.5 4.3-4.2 4.2zM39.6 39.6l-8.5-4.3 4.2-4.2zM39.6 8.4l-4.3 8.5-4.2-4.2zM8.4 39.6l4.3-8.5 4.2 4.2z"/><circle cx="24" cy="24" r="11"/></g><g fill="none" stroke="#1f1a17" stroke-width="1.5" stroke-linecap="round"><path d="M19 28q5 4 10 0"/></g><circle cx="20" cy="22" r="1.5" fill="#1f1a17"/><circle cx="28" cy="22" r="1.5" fill="#1f1a17"/></svg>`;
  function roman(n) {
    const t = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let s = ""; for (const [v, r] of t) { while (n >= v) { s += r; n -= v; } } return s || "0";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function splitName(name) {
    const m = String(name || "").match(/^(.*?)(?:\s·\s|,\s)(.*)$/);
    return m ? { title: m[1], sub: m[2] } : { title: String(name || ""), sub: "" };
  }
  /* o: {num (string|number), name, art (svg inner markup 200x260), image (data URI), emoji, cls, w (css length), sub} */
  function cardHTML(o) {
    const nm = o.sub != null ? { title: o.name, sub: o.sub } : splitName(o.name);
    const num = typeof o.num === "number" ? roman(o.num) : (o.num || "");
    // Conserver les silhouettes SVG des personnages encore à découvrir.
    const hidden = /(?:^|\s)(?:unknown|locked)(?:\s|$)/.test(o.cls || "");
    const raster = !hidden && typeof o.image === "string" && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(o.image);
    const ill = raster ? `<img src="${esc(o.image)}" alt="" draggable="false">` : o.art ? `<svg viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${o.art}</svg>` : `<span class="t-emoji">${o.emoji || "❔"}</span>`;
    return `<div class="tarot ${o.cls || ""}"${o.w ? ` style="--w:${o.w}"` : ""}><div class="t-in"><div class="t-num">${esc(num)}</div><div class="t-ill">${ill}</div><div class="t-name"><b>${esc(nm.title)}</b>${nm.sub ? `<i>${esc(nm.sub)}</i>` : ""}</div></div></div>`;
  }
  function backHTML(o) {
    o = o || {};
    return `<div class="tarot back ${o.cls || ""}"${o.w ? ` style="--w:${o.w}"` : ""}><div class="t-in"><div class="t-sun">${SUN}</div></div></div>`;
  }
  const kit = { PAL, CSS, cardHTML, backHTML, roman, splitName, esc };
  if (typeof module !== "undefined" && module.exports) module.exports = kit; else root.TarotKit = kit;
})(typeof globalThis !== "undefined" ? globalThis : this);
