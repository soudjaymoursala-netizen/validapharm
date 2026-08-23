/* ValidaPharm — Export des documents (Word .doc, impression PDF, JSON) */

function collectFormValuesToStaticHTML(root) {
  // Remplace inputs/textarea/select par leur valeur en texte, pour un export figé.
  const clone = root.cloneNode(true);
  clone.querySelectorAll("input, textarea, select").forEach(field => {
    const span = document.createElement("span");
    span.className = "static-value";
    if (field.tagName === "SELECT") {
      span.textContent = field.value || "—";
    } else {
      span.textContent = field.value || "—";
      span.style.whiteSpace = "pre-wrap";
    }
    field.replaceWith(span);
  });
  clone.querySelectorAll(".col-actions, .icon-btn").forEach(n => n.remove());
  clone.querySelectorAll("button").forEach(n => n.remove());
  return clone;
}

function exportToWord(mod) {
  const root = document.getElementById("docPreview");
  const staticClone = collectFormValuesToStaticHTML(root);
  const styles = `
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a1a;}
    h2{color:#0b3d5c;} h3{color:#0b3d5c;border-bottom:1px solid #ccc;padding-bottom:4px;}
    table{border-collapse:collapse;width:100%;margin-bottom:14px;}
    td,th{border:1px solid #999;padding:5px 7px;font-size:9.5pt;vertical-align:top;}
    th{background:#eef4f8;}
    .std-badges{margin-bottom:8px;} .std-badge{display:inline-block;border:1px solid #0b3d5c;color:#0b3d5c;border-radius:3px;padding:1px 6px;margin-right:5px;font-size:8.5pt;}
    .intro{font-style:italic;color:#444;}
    .note{font-size:9pt;color:#555;}
    .meta-grid{display:block;margin-bottom:10px;}
    .field-row{margin-bottom:6px;}
    .field-row label{display:block;font-weight:bold;font-size:9.5pt;}
  `;
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>${mod.title}</title><style>${styles}</style></head>
  <body>${staticClone.outerHTML}</body></html>`;
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const link = document.createElement("a");
  const doc = getDoc(mod.id);
  link.href = URL.createObjectURL(blob);
  link.download = `${(doc.meta.ref || mod.docPrefix).replace(/[^A-Za-z0-9_-]/g, "_")}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function printDocument() {
  window.print();
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(STATE.docs, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "validapharm-documents.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      STATE.docs = { ...STATE.docs, ...data };
      saveState();
      renderSidebar();
      renderMainDocument();
      alert("Import réussi.");
    } catch (e) {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(file);
}
