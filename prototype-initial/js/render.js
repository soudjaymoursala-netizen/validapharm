/* ValidaPharm — Moteur de rendu générique des formulaires et du document */

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

function emptyRowFromColumns(columns) {
  const row = {};
  columns.forEach(c => { row[c.key] = ""; });
  return row;
}

function getDoc(id) {
  return STATE.docs[id];
}

function ensureDocState(mod) {
  if (!STATE.docs[mod.id]) {
    STATE.docs[mod.id] = {
      meta: {
        ref: mod.docPrefix + "-" + new Date().getFullYear() + "-XXX",
        titre: mod.title,
        version: "01",
        site: "",
        redacteur: "", redacteur_date: "",
        verificateur: "", verificateur_date: "",
        approbateur: "", approbateur_date: "",
      },
      revisions: [{ version: "01", date: "", auteur: "", motif: "Création initiale" }],
      values: {},
      tables: {},
    };
    // init table rows depuis les définitions
    mod.sections.forEach(s => {
      if (s.type === "table") {
        STATE.docs[mod.id].tables[s.id] = (s.rows || []).map(r => ({ ...emptyRowFromColumns(s.columns), ...r }));
      }
      if (s.type === "fmea") {
        STATE.docs[mod.id].tables[s.id] = [ emptyFmeaRow() ];
      }
    });
  }
  return STATE.docs[mod.id];
}

function fieldInput(value, onChange, field) {
  let node;
  if (field.type === "textarea") {
    node = el("textarea", { rows: "3", placeholder: field.label || "" });
    node.value = value || "";
    node.addEventListener("input", () => onChange(node.value));
  } else if (field.type === "select") {
    node = el("select");
    (field.options || []).forEach(opt => {
      const o = el("option", { value: opt }, opt || "—");
      if (opt === value) o.selected = true;
      node.appendChild(o);
    });
    node.addEventListener("change", () => onChange(node.value));
  } else if (field.type === "date") {
    node = el("input", { type: "date" });
    node.value = value || "";
    node.addEventListener("input", () => onChange(node.value));
  } else if (field.type === "number") {
    node = el("input", { type: "number" });
    node.value = value || "";
    node.addEventListener("input", () => onChange(node.value));
  } else {
    node = el("input", { type: "text", placeholder: field.label || "" });
    node.value = value || "";
    node.addEventListener("input", () => onChange(node.value));
  }
  return node;
}

function renderGroup(mod, doc, section) {
  const wrap = el("div", { class: "section-block" });
  wrap.appendChild(el("h3", {}, section.label));
  if (section.note) wrap.appendChild(el("p", { class: "note" }, section.note));
  section.fields.forEach(f => {
    const row = el("div", { class: "field-row" });
    row.appendChild(el("label", {}, f.label));
    const input = fieldInput(doc.values[f.key], v => { doc.values[f.key] = v; saveState(); }, f);
    row.appendChild(input);
    wrap.appendChild(row);
  });
  return wrap;
}

function renderTable(mod, doc, section) {
  const wrap = el("div", { class: "section-block" });
  wrap.appendChild(el("h3", {}, section.label));
  if (section.note) wrap.appendChild(el("p", { class: "note" }, section.note));
  const table = el("table", { class: "editable-table" });
  const thead = el("thead");
  const trh = el("tr");
  section.columns.forEach(c => trh.appendChild(el("th", { style: c.width ? `width:${c.width}` : "" }, c.label)));
  trh.appendChild(el("th", { class: "col-actions" }, ""));
  thead.appendChild(trh);
  table.appendChild(thead);
  const tbody = el("tbody");
  const rows = doc.tables[section.id];

  function redrawRow(row, tr) {
    tr.innerHTML = "";
    section.columns.forEach(c => {
      const td = el("td");
      td.appendChild(fieldInput(row[c.key], v => { row[c.key] = v; saveState(); }, c));
      tr.appendChild(td);
    });
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
  }

  rows.forEach(row => {
    const tr = el("tr");
    redrawRow(row, tr);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);

  const addBtn = el("button", { class: "btn-secondary small" }, "+ Ajouter une ligne");
  addBtn.addEventListener("click", () => {
    rows.push(emptyRowFromColumns(section.columns));
    saveState();
    renderMainDocument();
  });
  wrap.appendChild(addBtn);
  return wrap;
}

function renderVModel() {
  const wrap = el("div", { class: "section-block" });
  wrap.appendChild(el("h3", {}, "Diagramme du cycle en V"));
  wrap.appendChild(el("div", { class: "vmodel-svg", html: VMODEL_SVG }));
  return wrap;
}

function renderMeta(mod, doc) {
  const wrap = el("div", { class: "doc-header" });
  wrap.appendChild(el("h2", {}, mod.title));
  wrap.appendChild(el("div", { class: "std-badges" }, [document.createRange().createContextualFragment(stdBadges(mod.standards))]));
  if (mod.intro) wrap.appendChild(el("p", { class: "intro" }, mod.intro));

  const metaGrid = el("div", { class: "meta-grid" });
  const metaFields = [
    ["ref", "Référence document"], ["titre", "Titre"], ["version", "Version"], ["site", "Site / entité"],
  ];
  metaFields.forEach(([k, label]) => {
    const row = el("div", { class: "field-row" });
    row.appendChild(el("label", {}, label));
    const input = el("input", { type: "text" });
    input.value = doc.meta[k] || "";
    input.addEventListener("input", () => { doc.meta[k] = input.value; saveState(); });
    row.appendChild(input);
    metaGrid.appendChild(row);
  });
  wrap.appendChild(metaGrid);
  return wrap;
}

function renderSignatures(doc) {
  const wrap = el("div", { class: "section-block signatures" });
  wrap.appendChild(el("h3", {}, "Approbations"));
  const table = el("table", { class: "sign-table" });
  const thead = el("thead", {}, el("tr", {}, ["Rôle", "Nom / Fonction", "Date", "Visa / signature électronique"].map(h => el("th", {}, h))));
  table.appendChild(thead);
  const tbody = el("tbody");
  [["redacteur", "Rédigé par"], ["verificateur", "Vérifié par"], ["approbateur", "Approuvé par"]].forEach(([k, label]) => {
    const tr = el("tr");
    tr.appendChild(el("td", {}, label));
    const tdName = el("td");
    const inputName = el("input", { type: "text" });
    inputName.value = doc.meta[k] || "";
    inputName.addEventListener("input", () => { doc.meta[k] = inputName.value; saveState(); });
    tdName.appendChild(inputName);
    tr.appendChild(tdName);
    const tdDate = el("td");
    const inputDate = el("input", { type: "date" });
    inputDate.value = doc.meta[k + "_date"] || "";
    inputDate.addEventListener("input", () => { doc.meta[k + "_date"] = inputDate.value; saveState(); });
    tdDate.appendChild(inputDate);
    tr.appendChild(tdDate);
    tr.appendChild(el("td", { class: "sign-cell" }, ""));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderRevisions(doc) {
  const wrap = el("div", { class: "section-block" });
  wrap.appendChild(el("h3", {}, "Historique des révisions"));
  const table = el("table", { class: "editable-table" });
  const thead = el("thead", {}, el("tr", {}, ["Version", "Date", "Auteur", "Motif de la révision"].map(h => el("th", {}, h))));
  table.appendChild(thead);
  const tbody = el("tbody");
  doc.revisions.forEach(rev => {
    const tr = el("tr");
    ["version", "date", "auteur", "motif"].forEach(k => {
      const td = el("td");
      const input = el("input", { type: k === "date" ? "date" : "text" });
      input.value = rev[k] || "";
      input.addEventListener("input", () => { rev[k] = input.value; saveState(); });
      td.appendChild(input);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  const addBtn = el("button", { class: "btn-secondary small" }, "+ Ajouter une révision");
  addBtn.addEventListener("click", () => {
    doc.revisions.push({ version: "", date: "", auteur: "", motif: "" });
    saveState();
    renderMainDocument();
  });
  wrap.appendChild(addBtn);
  return wrap;
}

function renderModule(mod) {
  const doc = ensureDocState(mod);
  const container = el("div", { class: "document" });
  container.appendChild(renderMeta(mod, doc));
  mod.sections.forEach(section => {
    if (section.type === "group") container.appendChild(renderGroup(mod, doc, section));
    else if (section.type === "table") container.appendChild(renderTable(mod, doc, section));
    else if (section.type === "vmodel") container.appendChild(renderVModel());
    else if (section.type === "fmea") container.appendChild(renderFmea(mod, doc, section));
  });
  container.appendChild(renderRevisions(doc));
  container.appendChild(renderSignatures(doc));
  return container;
}
