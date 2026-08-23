/* ValidaPharm — Module AMDEC / FMEA / FMECA avec calcul automatique de l'IPR (S x O x D) */

function emptyFmeaRow() {
  return {
    etape: "", mode_defaillance: "", effet: "", S: "",
    cause: "", O: "",
    detection: "", D: "",
    actions: "", responsable: "", echeance: "",
    S2: "", O2: "", D2: "",
  };
}

function ipr(row, suffix) {
  const s = Number(row["S" + suffix] || 0), o = Number(row["O" + suffix] || 0), d = Number(row["D" + suffix] || 0);
  return s && o && d ? s * o * d : "";
}

function iprClass(value) {
  if (value === "" || value == null) return "";
  const v = Number(value);
  if (v >= 100) return "ipr-critique";
  if (v >= 50) return "ipr-eleve";
  if (v >= 20) return "ipr-modere";
  return "ipr-faible";
}

function scaleSelect(value, onChange, labels) {
  const node = el("select");
  node.appendChild(el("option", { value: "" }, "—"));
  labels.forEach((label, i) => {
    const v = String(i + 1);
    const o = el("option", { value: v }, v + " - " + label);
    if (v === String(value)) o.selected = true;
    node.appendChild(o);
  });
  node.addEventListener("change", () => onChange(node.value));
  return node;
}

const SEV_LABELS = ["Négligeable", "Mineure", "Modérée", "Majeure", "Critique"];
const OCC_LABELS = ["Très rare", "Rare", "Occasionnelle", "Fréquente", "Très fréquente"];
const DET_LABELS = ["Détection quasi certaine", "Élevée", "Modérée", "Faible", "Détection quasi impossible"];

function renderFmea(mod, doc, section) {
  const wrap = el("div", { class: "section-block" });
  wrap.appendChild(el("h3", {}, section.label));
  wrap.appendChild(el("p", { class: "note" },
    "Cotation par défaut sur une échelle de 1 à 5 (adapter selon l'échelle choisie en section 1). IPR = Sévérité × Occurrence × Détection. Le seuil d'acceptabilité doit être défini et justifié par le site (procédure de gestion du risque qualité)."));

  const rows = doc.tables[section.id];
  const table = el("table", { class: "editable-table fmea-table" });
  const headLabels = ["Étape / Fonction", "Mode de défaillance", "Effet(s)", "S", "Cause(s)", "O", "Moyen de détection", "D", "IPR", "Actions recommandées", "Responsable", "Échéance", "S'", "O'", "D'", "IPR' après action", ""];
  table.appendChild(el("thead", {}, el("tr", {}, headLabels.map(h => el("th", {}, h)))));
  const tbody = el("tbody");

  function makeRow(row) {
    const tr = el("tr");
    const cellText = (key) => { const td = el("td"); const i = el("input", { type: "text" }); i.value = row[key] || ""; i.addEventListener("input", () => { row[key] = i.value; saveState(); }); td.appendChild(i); return td; };

    tr.appendChild(cellText("etape"));
    tr.appendChild(cellText("mode_defaillance"));
    tr.appendChild(cellText("effet"));
    const tdS = el("td"); tdS.appendChild(scaleSelect(row.S, v => { row.S = v; saveState(); renderMainDocument(); }, SEV_LABELS)); tr.appendChild(tdS);
    tr.appendChild(cellText("cause"));
    const tdO = el("td"); tdO.appendChild(scaleSelect(row.O, v => { row.O = v; saveState(); renderMainDocument(); }, OCC_LABELS)); tr.appendChild(tdO);
    tr.appendChild(cellText("detection"));
    const tdD = el("td"); tdD.appendChild(scaleSelect(row.D, v => { row.D = v; saveState(); renderMainDocument(); }, DET_LABELS)); tr.appendChild(tdD);
    const iprVal = ipr(row, "");
    tr.appendChild(el("td", { class: "ipr-cell " + iprClass(iprVal) }, String(iprVal || "")));
    tr.appendChild(cellText("actions"));
    tr.appendChild(cellText("responsable"));
    tr.appendChild(cellText("echeance"));
    const tdS2 = el("td"); tdS2.appendChild(scaleSelect(row.S2, v => { row.S2 = v; saveState(); renderMainDocument(); }, SEV_LABELS)); tr.appendChild(tdS2);
    const tdO2 = el("td"); tdO2.appendChild(scaleSelect(row.O2, v => { row.O2 = v; saveState(); renderMainDocument(); }, OCC_LABELS)); tr.appendChild(tdO2);
    const tdD2 = el("td"); tdD2.appendChild(scaleSelect(row.D2, v => { row.D2 = v; saveState(); renderMainDocument(); }, DET_LABELS)); tr.appendChild(tdD2);
    const iprVal2 = ipr(row, "2");
    tr.appendChild(el("td", { class: "ipr-cell " + iprClass(iprVal2) }, String(iprVal2 || "")));

    const tdAct = el("td", { class: "col-actions" });
    const del = el("button", { class: "icon-btn", title: "Supprimer la ligne" }, "✕");
    del.addEventListener("click", () => {
      const idx = rows.indexOf(row);
      if (idx >= 0) rows.splice(idx, 1);
      saveState();
      renderMainDocument();
    });
    tdAct.appendChild(del);
    tr.appendChild(tdAct);
    return tr;
  }

  rows.forEach(row => tbody.appendChild(makeRow(row)));
  table.appendChild(tbody);
  wrap.appendChild(table);

  const addBtn = el("button", { class: "btn-secondary small" }, "+ Ajouter un mode de défaillance");
  addBtn.addEventListener("click", () => {
    rows.push(emptyFmeaRow());
    saveState();
    renderMainDocument();
  });
  wrap.appendChild(addBtn);

  const legend = el("div", { class: "legend" }, [
    el("span", { class: "legend-item ipr-critique" }, "IPR ≥ 100 : critique"),
    el("span", { class: "legend-item ipr-eleve" }, "50-99 : élevé"),
    el("span", { class: "legend-item ipr-modere" }, "20-49 : modéré"),
    el("span", { class: "legend-item ipr-faible" }, "< 20 : faible"),
  ]);
  wrap.appendChild(legend);
  return wrap;
}

const VMODEL_SVG = `
<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagramme du cycle en V de qualification">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker>
  </defs>
  <g font-family="Inter, Arial, sans-serif" font-size="13">
    <line x1="60" y1="40" x2="330" y2="190" stroke="currentColor" stroke-width="2"/>
    <line x1="330" y1="190" x2="600" y2="40" stroke="currentColor" stroke-width="2"/>

    <g>
      <rect x="20" y="15" width="150" height="42" rx="6" class="vbox"/>
      <text x="95" y="40" text-anchor="middle">URS (besoins)</text>
    </g>
    <g>
      <rect x="90" y="80" width="150" height="42" rx="6" class="vbox"/>
      <text x="165" y="105" text-anchor="middle">FS (fonctionnel)</text>
    </g>
    <g>
      <rect x="180" y="145" width="150" height="42" rx="6" class="vbox"/>
      <text x="255" y="170" text-anchor="middle">DS (conception)</text>
    </g>

    <g>
      <rect x="255" y="200" width="150" height="42" rx="6" class="vbox vbox-build"/>
      <text x="330" y="225" text-anchor="middle">Construction / configuration</text>
    </g>

    <g>
      <rect x="410" y="145" width="150" height="42" rx="6" class="vbox vbox-verif"/>
      <text x="485" y="170" text-anchor="middle">IQ (installation)</text>
    </g>
    <g>
      <rect x="480" y="80" width="150" height="42" rx="6" class="vbox vbox-verif"/>
      <text x="555" y="105" text-anchor="middle">OQ (opérationnel)</text>
    </g>
    <g>
      <rect x="550" y="15" width="150" height="42" rx="6" class="vbox vbox-verif"/>
      <text x="625" y="40" text-anchor="middle">PQ (performance)</text>
    </g>

    <line x1="255" y1="166" x2="410" y2="166" stroke="currentColor" stroke-dasharray="4 3" marker-end="url(#arrow)"/>
    <line x1="165" y1="101" x2="555" y2="101" stroke="currentColor" stroke-dasharray="4 3" marker-end="url(#arrow)"/>
    <line x1="95" y1="36" x2="625" y2="36" stroke="currentColor" stroke-dasharray="4 3" marker-end="url(#arrow)"/>
    <text x="330" y="290" text-anchor="middle" font-style="italic">Traçabilité (vérification croisée) — voir matrice de traçabilité ci-dessous</text>
  </g>
</svg>`;
