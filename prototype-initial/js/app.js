/* ValidaPharm — Application principale (état, navigation, bibliothèque de normes) */

const STORAGE_KEY = "validapharm_state_v1";

let STATE = loadState();
let currentModuleId = STATE.lastModuleId || MODULES[0].id;
let currentView = "module"; // "module" | "standards" | "home"

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { docs: {}, lastModuleId: null };
}

function saveState() {
  STATE.lastModuleId = currentModuleId;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch (e) { console.warn("Sauvegarde locale impossible", e); }
}

function groupModulesByCategory() {
  const groups = {};
  MODULES.forEach(m => {
    groups[m.category] = groups[m.category] || [];
    groups[m.category].push(m);
  });
  return groups;
}

function renderSidebar() {
  const nav = document.getElementById("sidebarNav");
  nav.innerHTML = "";

  const homeBtn = el("button", { class: "nav-home" + (currentView === "home" ? " active" : "") }, "🏠 Accueil");
  homeBtn.addEventListener("click", () => { currentView = "home"; renderView(); highlightNav(); });
  nav.appendChild(homeBtn);

  const groups = groupModulesByCategory();
  Object.entries(groups).forEach(([cat, mods]) => {
    nav.appendChild(el("div", { class: "nav-group-title" }, cat));
    mods.forEach(m => {
      const hasDoc = !!STATE.docs[m.id];
      const btn = el("button", { class: "nav-item" + (currentModuleId === m.id && currentView === "module" ? " active" : ""), "data-mod": m.id },
        [el("span", {}, m.title), hasDoc ? el("span", { class: "dot" }, "") : null]);
      btn.addEventListener("click", () => { currentModuleId = m.id; currentView = "module"; saveState(); renderView(); highlightNav(); });
      nav.appendChild(btn);
    });
  });

  nav.appendChild(el("div", { class: "nav-group-title" }, "Référentiel"));
  const stdBtn = el("button", { class: "nav-item" + (currentView === "standards" ? " active" : "") }, "📚 Normes & guides");
  stdBtn.addEventListener("click", () => { currentView = "standards"; renderView(); highlightNav(); });
  nav.appendChild(stdBtn);
}

function highlightNav() {
  document.querySelectorAll(".nav-item, .nav-home").forEach(n => n.classList.remove("active"));
  if (currentView === "home") document.querySelector(".nav-home")?.classList.add("active");
  else if (currentView === "standards") {
    document.querySelectorAll(".nav-item").forEach(n => { if (n.textContent.includes("Normes")) n.classList.add("active"); });
  } else {
    document.querySelectorAll(".nav-item").forEach(n => { if (n.getAttribute("data-mod") === currentModuleId) n.classList.add("active"); });
  }
}

function renderHome() {
  const main = document.getElementById("mainContent");
  main.innerHTML = "";
  const wrap = el("div", { class: "home" });
  wrap.appendChild(el("h1", {}, "ValidaPharm"));
  wrap.appendChild(el("p", { class: "subtitle" }, "Assistant de rédaction pour la qualité, la validation et la gestion du risque — industrie pharmaceutique & dispositifs médicaux."));
  wrap.appendChild(el("p", {}, "Choisissez un module dans le menu de gauche pour rédiger un Change Control, une CAPA, un protocole/rapport FAT-SAT-IQ-OQ-PQ, une validation de nettoyage, un plan de validation en cycle en V, une validation de système informatisé (CSV), une évaluation d'intégrité des données, une analyse de risque ou une AMDEC/FMEA/FMECA."));

  const grid = el("div", { class: "home-grid" });
  const groups = groupModulesByCategory();
  Object.entries(groups).forEach(([cat, mods]) => {
    const card = el("div", { class: "home-card" });
    card.appendChild(el("h3", {}, cat));
    const ul = el("ul");
    mods.forEach(m => {
      const li = el("li");
      const link = el("a", { href: "#" }, m.title);
      link.addEventListener("click", (ev) => { ev.preventDefault(); currentModuleId = m.id; currentView = "module"; saveState(); renderView(); highlightNav(); });
      li.appendChild(link);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  wrap.appendChild(el("h3", {}, "Import / Export global"));
  const actions = el("div", { class: "toolbar" });
  const exportBtn = el("button", { class: "btn-secondary" }, "⬇ Exporter tous mes documents (JSON)");
  exportBtn.addEventListener("click", exportJSON);
  const importInput = el("input", { type: "file", accept: "application/json", style: "display:none" });
  importInput.addEventListener("change", (e) => { if (e.target.files[0]) importJSON(e.target.files[0]); });
  const importBtn = el("button", { class: "btn-secondary" }, "⬆ Importer un fichier JSON");
  importBtn.addEventListener("click", () => importInput.click());
  actions.appendChild(exportBtn);
  actions.appendChild(importBtn);
  actions.appendChild(importInput);
  wrap.appendChild(actions);

  main.appendChild(wrap);
}

function renderStandardsLibrary() {
  const main = document.getElementById("mainContent");
  main.innerHTML = "";
  const wrap = el("div", { class: "home" });
  wrap.appendChild(el("h1", {}, "Bibliothèque de normes & guides"));
  wrap.appendChild(el("p", { class: "subtitle" }, "Référentiel indicatif utilisé par les modules. Toujours se référer au texte officiel en vigueur et aux documents internes du site (dossier de normes)."));
  const table = el("table", { class: "editable-table std-table" });
  table.appendChild(el("thead", {}, el("tr", {}, ["Référence", "Titre", "Domaine d'application"].map(h => el("th", {}, h)))));
  const tbody = el("tbody");
  Object.values(STANDARDS).forEach(s => {
    tbody.appendChild(el("tr", {}, [el("td", {}, el("b", {}, s.code)), el("td", {}, s.title), el("td", {}, s.scope)]));
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  main.appendChild(wrap);
}

function renderMainDocument() {
  const mod = MODULES.find(m => m.id === currentModuleId);
  const main = document.getElementById("mainContent");
  main.innerHTML = "";

  const toolbar = el("div", { class: "toolbar" });
  const wordBtn = el("button", { class: "btn-primary" }, "⬇ Exporter en Word (.doc)");
  wordBtn.addEventListener("click", () => exportToWord(mod));
  const printBtn = el("button", { class: "btn-secondary" }, "🖨 Imprimer / PDF");
  printBtn.addEventListener("click", printDocument);
  const dupBtn = el("button", { class: "btn-secondary" }, "⎘ Dupliquer ce document");
  dupBtn.addEventListener("click", () => duplicateDoc(mod));
  const resetBtn = el("button", { class: "btn-danger" }, "🗑 Réinitialiser ce document");
  resetBtn.addEventListener("click", () => resetDoc(mod));
  toolbar.appendChild(wordBtn);
  toolbar.appendChild(printBtn);
  toolbar.appendChild(dupBtn);
  toolbar.appendChild(resetBtn);
  main.appendChild(toolbar);

  const preview = el("div", { id: "docPreview" });
  preview.appendChild(renderModule(mod));
  main.appendChild(preview);
  renderSidebar();
}

function duplicateDoc(mod) {
  const doc = getDoc(mod.id);
  const copyId = mod.id + "__copy_" + Date.now();
  STATE.docs[copyId] = JSON.parse(JSON.stringify(doc));
  STATE.docs[copyId].meta.ref = doc.meta.ref + "-COPIE";
  alert("Une copie interne a été enregistrée dans l'état de l'application (export JSON pour la conserver). Pour un nouveau document du même type, réinitialisez plutôt via 'Réinitialiser ce document' après export.");
  saveState();
}

function resetDoc(mod) {
  if (!confirm("Réinitialiser ce document effacera toutes les données saisies pour ce module. Continuer ?")) return;
  delete STATE.docs[mod.id];
  saveState();
  renderMainDocument();
}

function renderView() {
  if (currentView === "home") renderHome();
  else if (currentView === "standards") renderStandardsLibrary();
  else renderMainDocument();
}

document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
  currentView = STATE.lastModuleId ? "module" : "home";
  renderView();
  highlightNav();
});
