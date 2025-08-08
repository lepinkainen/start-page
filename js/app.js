import {
  SETTINGS,
  PROVIDERS,
  LABEL_TO_PROVIDER,
  LABEL_TO_TYPE,
} from "./constants.js";
import { byId, normalize, encodeQuery } from "./utils.js";
import { initMLPipeline, LABELS } from "./ml.js";
import { classifyWithWorker } from "./worker-client.js";

const qEl = byId("q");
const chipsEl = byId("chips");
const recEl = byId("rec");
const mlEl = byId("ml");
const newTabEl = byId("newtab");
const goEl = byId("go");

newTabEl.checked = SETTINGS.openInNewTab;

let MODEL = {
  enabled: true,
  ready: false,
  ctx: "",
  suggest: null,
  scores: null,
  runtime: 0,
  inFlight: null,
  lastId: 0,
};

function findProviderByAlias(alias) {
  const a = alias.toLowerCase();
  return PROVIDERS.find((p) =>
    (p.aliases || []).some((x) => x.toLowerCase() === a)
  );
}

function providerById(id) {
  return PROVIDERS.find((p) => p.id === id);
}

function classifyQuery(q) {
  const s = normalize(q);
  if (!s) return "unknown";
  if (s.startsWith("!")) return "alias";
  if (
    /\b(tv|tv[-\s]?show|series|mini[-\s]?series|s\d{1,2}e\d{1,2}|season|episode|ep\s*\d{1,3})\b/i.test(
      s
    )
  )
    return "tv";
  if (/\b\d{4}\b/.test(s)) return "movie";
  if (
    /\b(ps5|ps4|xbox|xb1|xbxs|series\s?[xs]|switch|nintendo|playstation|opencritic|metacritic|dlc)\b/i.test(
      s
    )
  )
    return "game";
  return "general";
}

function resolveAlias(q) {
  const first = q.trim().split(/\s+/)[0];
  const prov = findProviderByAlias(first);
  if (!prov) return null;
  const rest = q.trim().slice(first.length).trim();
  return { prov, rest };
}

function shouldTrustModel() {
  const scores = MODEL.scores;
  if (!scores) return false;
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topL, topS] = entries[0];
  const nextS = entries[1] ? entries[1][1] : 0;
  return topS >= 0.6 && topS - nextS >= 0.15;
}

function recommendedProvider(q) {
  const alias = resolveAlias(q);
  if (alias) return alias.prov.id;

  const cls = classifyQuery(q);
  let id =
    SETTINGS.defaultProvider && cls === "unknown"
      ? SETTINGS.defaultProvider
      : cls === "tv"
      ? "imdb"
      : cls === "movie"
      ? "letterboxd"
      : cls === "game"
      ? "opencritic"
      : SETTINGS.defaultProvider || "kagi";

  if (
    MODEL.enabled &&
    MODEL.suggest &&
    MODEL.ctx === normalize(q) &&
    shouldTrustModel()
  ) {
    const mapped = LABEL_TO_PROVIDER[MODEL.suggest];
    if (mapped) id = mapped;
  }
  return id;
}

function makeUrl(provider, q) {
  let query = q;
  const alias = resolveAlias(q);
  if (alias) query = alias.rest;
  const tpl =
    typeof provider.url === "function" ? provider.url() : provider.url;
  return tpl.replace("{q}", encodeQuery(query));
}

function openUrl(url) {
  if (SETTINGS.openInNewTab) window.open(url, "_blank", "noopener");
  else window.location.href = url;
}

function renderChips(query) {
  chipsEl.innerHTML = "";
  const recId = recommendedProvider(query);
  recEl.textContent = recId ? `Recommended: ${providerById(recId)?.name}` : "";
  if (MODEL.suggest && MODEL.ctx === normalize(query)) {
    const mapped = LABEL_TO_PROVIDER[MODEL.suggest];
    const trust = shouldTrustModel();
    mlEl.textContent = `AI: ${MODEL.suggest}${
      MODEL.scores ? " " + scorePct(MODEL.suggest, MODEL.scores) : ""
    }${trust ? "" : " (?)"}`;
  }

  PROVIDERS.forEach((p, i) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.setAttribute("type", "button");
    chip.dataset.id = p.id;
    chip.dataset.pinned = SETTINGS.pinned.includes(p.id);
    chip.innerHTML = `
      <span class="pin" title="Pin/unpin"></span>
      <strong>${p.name}</strong>
      <span class="kbd">${i < 10 ? `Alt+${i}` : ""}</span>
    `;
    chip.onclick = (ev) => {
      if (ev.target.classList.contains("pin")) {
        togglePin(p.id);
        ev.stopPropagation();
        return;
      }
      const url = makeUrl(p, qEl.value);
      openUrl(url);
    };
    chip.addEventListener("auxclick", (ev) => {
      if (ev.button === 1) {
        openUrl(makeUrl(p, qEl.value));
      }
    });
    chipsEl.appendChild(chip);
  });

  // Mark all chips that match the predicted type
  const selectedIds = new Set(selectedProvidersForQuery(query));
  chipsEl.querySelectorAll(".chip").forEach((ch) => {
    const id = ch.dataset.id;
    if (selectedIds.has(id)) {
      ch.dataset.selected = "true";
    }
  });
  // Also emphasize the single recommended one
  const recChip = chipsEl.querySelector(`.chip[data-id="${recId}"]`);
  if (recChip) recChip.dataset.selected = "true";
  applyPinnedState();
}

function scorePct(label, scores) {
  const v = scores[label];
  if (typeof v !== "number") return "";
  return `(${Math.round(v * 100)}%)`;
}

function togglePin(id) {
  const idx = SETTINGS.pinned.indexOf(id);
  if (idx === -1) SETTINGS.pinned.push(id);
  else SETTINGS.pinned.splice(idx, 1);
  localStorage.setItem("pinnedProviders", JSON.stringify(SETTINGS.pinned));
  applyPinnedState();
}

function applyPinnedState() {
  chipsEl.querySelectorAll(".chip").forEach((ch) => {
    ch.dataset.pinned = SETTINGS.pinned.includes(ch.dataset.id);
  });
}

function selectedProvidersForQuery(q) {
  const t = predictedType(q);
  if (t === "general" || t === "alias") return [];
  return PROVIDERS.filter(
    (p) => Array.isArray(p.types) && p.types.includes(t)
  ).map((p) => p.id);
}

function predictedType(q) {
  if (MODEL.suggest && MODEL.ctx === normalize(q)) {
    return LABEL_TO_TYPE[MODEL.suggest] || "general";
  }
  const h = classifyQuery(q);
  if (h === "tv" || h === "movie" || h === "game") return h;
  return "general";
}

async function startClassification(q) {
  const id = Math.random().toString(36).slice(2);
  MODEL.inFlight = id;
  MODEL.ctx = normalize(q);

  try {
    byId("ml").textContent = "ML classifying...";
    const pipeline = await initMLPipeline();

    if (!pipeline) {
      return;
    }

    const startTime = performance.now();

    let result;
    try {
      result = await pipeline(q, LABELS);
    } catch (e) {
      console.error("Pipeline classification error:", e);
      byId("ml").textContent = "ML error";
      return;
    }

    const endTime = performance.now();

    if (MODEL.inFlight !== id) return;
    if (normalize(qEl.value) !== MODEL.ctx) return;

    // Process results as usual...
    const scores = {};
    result.scores.forEach((score, idx) => {
      scores[result.labels[idx]] = score;
    });

    MODEL.suggest = result.labels[0];
    MODEL.scores = scores;
    MODEL.runtime = Math.round(endTime - startTime);

    byId("ml").textContent = `AI: ${MODEL.suggest} (${Math.round(
      scores[MODEL.suggest] * 100
    )}%) (${MODEL.runtime}ms)`;
    renderChips(qEl.value);
  } catch (error) {
    console.error("startClassification error:", error);
    byId("ml").textContent = "ML error";
  }
}

function openRecommended() {
  const recId = recommendedProvider(qEl.value);
  const prov = providerById(recId) || providerById("kagi");
  openUrl(makeUrl(prov, qEl.value));
}

function openPinned() {
  const list = SETTINGS.pinned.length
    ? SETTINGS.pinned
    : [recommendedProvider(qEl.value)];
  list.forEach((id) => {
    const prov = providerById(id);
    if (prov) openUrl(makeUrl(prov, qEl.value));
  });
}

qEl.addEventListener("input", () => {
  const val = qEl.value;
  renderChips(val);
  if (val && !resolveAlias(val)) {
    if (MODEL.enabled) startClassification(val);
  } else {
    mlEl.textContent = "";
    MODEL.suggest = null;
    MODEL.scores = null;
  }
});

qEl.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    if (ev.ctrlKey || ev.metaKey) {
      openPinned();
    } else {
      openRecommended();
    }
  }
});

goEl.addEventListener("click", openRecommended);
newTabEl.addEventListener("change", () => {
  SETTINGS.openInNewTab = newTabEl.checked;
  localStorage.setItem("openInNewTab", JSON.stringify(SETTINGS.openInNewTab));
});

document.addEventListener("DOMContentLoaded", () => {
  qEl.value = "";
  renderChips(qEl.value);
  qEl.focus();
});
