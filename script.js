// =====================================================
//  Bugzettel – kleines Tool zum Schreiben von Bug-Reports
//  Kein Framework, nur normales JavaScript.
// =====================================================

const SPEICHER_KEY = "bugzettel-entwurf";

// Häufig gebrauchte Elemente einmal holen
const el = {
  titel: document.getElementById("titel"),
  schwere: document.getElementById("schwere"),
  schritte: document.getElementById("schritte"),
  erwartet: document.getElementById("erwartet"),
  tatsaechlich: document.getElementById("tatsaechlich"),
  umgebung: document.getElementById("umgebung"),
  notizen: document.getElementById("notizen"),
  ausgabe: document.getElementById("ausgabe"),
  hinweise: document.getElementById("hinweise"),
  kopieren: document.getElementById("kopieren"),
};

let format = "markdown";

// -----------------------------------------------------
// 1) Umgebung automatisch erkennen
// -----------------------------------------------------
function erkenneBrowser(ua) {
  // Reihenfolge ist wichtig: Edge und Opera enthalten auch "Chrome"
  const muster = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, regex] of muster) {
    const treffer = ua.match(regex);
    if (treffer) return name + " " + treffer[1].split(".")[0];
  }
  return "Unbekannt";
}

function erkenneSystem(ua) {
  if (/Android ([\d.]+)/.test(ua)) return "Android " + RegExp.$1;
  if (/iPhone|iPad/.test(ua)) {
    const v = ua.match(/OS (\d+)_(\d+)/);
    return "iOS " + (v ? v[1] + "." + v[2] : "");
  }
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unbekannt";
}

function standardUmgebung() {
  const ua = navigator.userAgent;
  return [
    "Browser: " + erkenneBrowser(ua),
    "System: " + erkenneSystem(ua),
    "Fenster: " + window.innerWidth + " x " + window.innerHeight,
    "Bildschirm: " + screen.width + " x " + screen.height + " @" + window.devicePixelRatio + "x",
    "Sprache: " + navigator.language,
    "Datum: " + new Date().toLocaleString("de-DE"),
  ].join("\n");
}

// -----------------------------------------------------
// 2) Schritte-Liste (dynamisch hinzufügen / entfernen)
// -----------------------------------------------------
function schrittHinzufuegen(text = "") {
  const li = document.createElement("li");
  li.innerHTML = `
    <div class="zeile">
      <input type="text" placeholder="Was hast du gemacht?">
      <button type="button" class="weg" title="Schritt entfernen">×</button>
    </div>`;
  const input = li.querySelector("input");
  input.value = text;

  // Enter im letzten Feld = neuer Schritt (spart Klicks)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      schrittHinzufuegen().focus();
    }
  });

  li.querySelector(".weg").addEventListener("click", () => {
    li.remove();
    if (el.schritte.children.length === 0) schrittHinzufuegen();
    aktualisieren();
  });

  el.schritte.appendChild(li);
  return input;
}

function schritteAuslesen() {
  return [...el.schritte.querySelectorAll("input")]
    .map((i) => i.value.trim())
    .filter((s) => s !== "");
}

// -----------------------------------------------------
// 3) Daten sammeln und in verschiedene Formate bringen
// -----------------------------------------------------
function daten() {
  return {
    titel: el.titel.value.trim(),
    schwere: el.schwere.value,
    schritte: schritteAuslesen(),
    erwartet: el.erwartet.value.trim(),
    tatsaechlich: el.tatsaechlich.value.trim(),
    umgebung: el.umgebung.value.trim(),
    notizen: el.notizen.value.trim(),
  };
}

// Jedes Format beschreibt nur, wie Überschrift, Liste usw. aussehen.
const formate = {
  markdown: {
    titel: (t) => "## " + t,
    ueberschrift: (t) => "### " + t,
    nummer: (s, i) => `${i + 1}. ${s}`,
    punkt: (s) => "- " + s,
    fett: (t) => `**${t}**`,
  },
  jira: {
    titel: (t) => "h2. " + t,
    ueberschrift: (t) => "h3. " + t,
    nummer: (s) => "# " + s,
    punkt: (s) => "* " + s,
    fett: (t) => `*${t}*`,
  },
  text: {
    titel: (t) => t + "\n" + "=".repeat(Math.min(t.length, 60)),
    ueberschrift: (t) => t.toUpperCase(),
    nummer: (s, i) => `${i + 1}) ${s}`,
    punkt: (s) => "  " + s,
    fett: (t) => t,
  },
};

function baueReport(d, f) {
  const leer = "(noch leer)";
  const teile = [];

  teile.push(f.titel(d.titel || "Ohne Titel"));
  teile.push(f.fett("Schweregrad:") + " " + d.schwere);

  teile.push(f.ueberschrift("Schritte zum Reproduzieren"));
  teile.push(d.schritte.length ? d.schritte.map(f.nummer).join("\n") : leer);

  teile.push(f.ueberschrift("Erwartetes Ergebnis"));
  teile.push(d.erwartet || leer);

  teile.push(f.ueberschrift("Tatsächliches Ergebnis"));
  teile.push(d.tatsaechlich || leer);

  if (d.umgebung) {
    teile.push(f.ueberschrift("Umgebung"));
    teile.push(d.umgebung.split("\n").map(f.punkt).join("\n"));
  }

  if (d.notizen) {
    teile.push(f.ueberschrift("Notizen"));
    teile.push(d.notizen);
  }

  return teile.join("\n\n");
}

// -----------------------------------------------------
// 4) Qualitäts-Check: typische Fehler in Bug-Reports
// -----------------------------------------------------
const VAGE_WOERTER = ["geht nicht", "funktioniert nicht", "kaputt", "fehler", "bug", "problem"];

function pruefe(d) {
  const warnungen = [];

  if (d.titel.length < 15) {
    warnungen.push("Titel ist sehr kurz – beschreibe WO und WAS passiert.");
  } else if (VAGE_WOERTER.some((w) => d.titel.toLowerCase() === w || d.titel.toLowerCase().startsWith(w + " "))) {
    warnungen.push("Titel klingt vage. Besser: „Warenkorb leert sich nach Seitenwechsel“.");
  }

  if (d.schritte.length === 0) {
    warnungen.push("Keine Schritte – ohne Schritte kann niemand den Fehler nachstellen.");
  } else if (d.schritte.length === 1) {
    warnungen.push("Nur ein Schritt. Startpunkt vergessen? (z.B. „Als Gast auf /shop öffnen“)");
  }

  if (!d.erwartet) warnungen.push("Erwartetes Ergebnis fehlt.");
  if (!d.tatsaechlich) warnungen.push("Tatsächliches Ergebnis fehlt.");

  if (d.erwartet && d.erwartet.toLowerCase() === d.tatsaechlich.toLowerCase()) {
    warnungen.push("Erwartet und tatsächlich sind identisch – dann ist es kein Bug?");
  }

  if ((d.schwere === "Kritisch" || d.schwere === "Hoch") && !d.notizen) {
    warnungen.push("Bei hoher Priorität helfen Logs oder ein Screenshot-Hinweis in den Notizen.");
  }

  return warnungen;
}

function zeigeHinweise(warnungen) {
  el.hinweise.innerHTML = "";
  if (warnungen.length === 0) {
    const li = document.createElement("li");
    li.className = "gut";
    li.textContent = "Sieht vollständig aus. Ab ins Ticket!";
    el.hinweise.appendChild(li);
    return;
  }
  for (const text of warnungen) {
    const li = document.createElement("li");
    li.className = "warnung";
    li.textContent = text; // textContent statt innerHTML = sicher gegen HTML-Injection
    el.hinweise.appendChild(li);
  }
}

// -----------------------------------------------------
// 5) Speichern / Laden (localStorage)
// -----------------------------------------------------
function speichern(d) {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify({ ...d, format }));
  } catch (e) {
    // z.B. im privaten Modus – dann eben ohne Speichern
  }
}

function laden() {
  try {
    return JSON.parse(localStorage.getItem(SPEICHER_KEY));
  } catch (e) {
    return null;
  }
}

// -----------------------------------------------------
// 6) Alles zusammen: bei jeder Eingabe neu berechnen
// -----------------------------------------------------
function aktualisieren() {
  const d = daten();
  el.ausgabe.textContent = baueReport(d, formate[format]);
  zeigeHinweise(pruefe(d));
  speichern(d);
}

function formatSetzen(neu) {
  format = neu;
  document.querySelectorAll(".umschalter button").forEach((b) => {
    b.classList.toggle("aktiv", b.dataset.format === neu);
  });
  aktualisieren();
}

function startwerte(gespeichert) {
  const g = gespeichert || {};
  el.titel.value = g.titel || "";
  el.schwere.value = g.schwere || "Mittel";
  el.erwartet.value = g.erwartet || "";
  el.tatsaechlich.value = g.tatsaechlich || "";
  el.umgebung.value = g.umgebung || standardUmgebung();
  el.notizen.value = g.notizen || "";

  el.schritte.innerHTML = "";
  const schritte = g.schritte && g.schritte.length ? g.schritte : [""];
  schritte.forEach((s) => schrittHinzufuegen(s));

  formatSetzen(g.format || "markdown");
}

// --- Events ---
document.getElementById("formular").addEventListener("input", aktualisieren);

document.getElementById("schritt-neu").addEventListener("click", () => {
  schrittHinzufuegen().focus();
});

document.querySelectorAll(".umschalter button").forEach((b) => {
  b.addEventListener("click", () => formatSetzen(b.dataset.format));
});

document.getElementById("leeren").addEventListener("click", () => {
  if (!confirm("Wirklich alles löschen?")) return;
  try { localStorage.removeItem(SPEICHER_KEY); } catch (e) {}
  startwerte(null);
  el.titel.focus();
});

el.kopieren.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(el.ausgabe.textContent);
    el.kopieren.textContent = "Kopiert ✓";
    el.kopieren.classList.add("ok");
  } catch (e) {
    el.kopieren.textContent = "Bitte manuell kopieren";
  }
  setTimeout(() => {
    el.kopieren.textContent = "Kopieren";
    el.kopieren.classList.remove("ok");
  }, 1500);
});

// Los geht's
startwerte(laden());
