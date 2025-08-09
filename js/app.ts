import type {
  Provider,
  Settings,
  MLModel,
  AliasResult,
  LabelType,
  ProviderType,
} from "./types.ts";
import {
  SETTINGS,
  PROVIDERS,
} from "./constants.ts";
import { byId, normalize, encodeQuery } from "./utils.ts";
import { initMLPipeline } from "./ml.ts";
import { 
  LABELS, 
  LABEL_TO_PROVIDER, 
  LABEL_TO_TYPE, 
  CATEGORIES,
  classifyByHeuristics 
} from "./categories.ts";

document.addEventListener("DOMContentLoaded", () => {
  qEl.value = "";
  renderChips(qEl.value);
  qEl.focus();

  // Initialize ML pipeline immediately on page load
  initMLPipeline().then(() => {
    console.log("ML pipeline preloaded and ready");
  });
});

// Typed DOM elements
const qEl = byId("q") as HTMLInputElement;
const chipsEl = byId("chips") as HTMLElement;
const recEl = byId("rec") as HTMLElement;
const mlEl = byId("ml") as HTMLElement;
const newTabEl = byId("newtab") as HTMLInputElement;
const goEl = byId("go") as HTMLButtonElement;

newTabEl.checked = SETTINGS.openInNewTab;

// Typed MODEL object
const MODEL: MLModel = {
  enabled: true,
  ready: false,
  ctx: "",
  suggest: null,
  scores: null,
  runtime: 0,
  inFlight: null,
  lastId: 0,
};

function findProviderByAlias(alias: string): Provider | undefined {
  const a = alias.toLowerCase();
  return PROVIDERS.find((p) =>
    (p.aliases || []).some((x) => x.toLowerCase() === a)
  );
}

function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}


function resolveAlias(q: string): AliasResult | null {
  const first = q.trim().split(/\s+/)[0];
  const prov = findProviderByAlias(first);
  if (!prov) return null;
  const rest = q.trim().slice(first.length).trim();
  return { prov, rest };
}

function shouldTrustModel(): boolean {
  const scores = MODEL.scores;
  if (!scores) return false;
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topL, topS] = entries[0];
  const nextS = entries[1] ? entries[1][1] : 0;
  return topS >= 0.6 && topS - nextS >= 0.15;
}

function recommendedProvider(q: string): string {
  const alias = resolveAlias(q);
  if (alias) return alias.prov.id;

  // Try heuristic classification first
  const heuristicType = classifyByHeuristics(q);
  let id = SETTINGS.defaultProvider || "kagi";
  
  if (heuristicType) {
    // Find the category with matching providerType and use its default provider
    const category = Object.values(CATEGORIES).find(c => c.providerType === heuristicType);
    if (category) {
      id = category.defaultProvider;
    }
  }

  // Override with ML suggestion if available and trusted
  if (
    MODEL.enabled &&
    MODEL.suggest &&
    MODEL.ctx === normalize(q) &&
    shouldTrustModel()
  ) {
    const mapped = LABEL_TO_PROVIDER[MODEL.suggest as LabelType];
    if (mapped) id = mapped;
  }
  return id;
}

function makeUrl(provider: Provider, q: string): string {
  let query = q;
  const alias = resolveAlias(q);
  if (alias) query = alias.rest;
  const tpl =
    typeof provider.url === "function" ? provider.url() : provider.url;
  return tpl.replace("{q}", encodeQuery(query));
}

function openUrl(url: string): void {
  if (SETTINGS.openInNewTab) window.open(url, "_blank", "noopener");
  else window.location.href = url;
}

function renderChips(query: string): void {
  chipsEl.innerHTML = "";
  const recId = recommendedProvider(query);
  recEl.textContent = recId ? `Recommended: ${providerById(recId)?.name}` : "";
  if (MODEL.suggest && MODEL.ctx === normalize(query)) {
    const mapped = LABEL_TO_PROVIDER[MODEL.suggest as LabelType];
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
    chip.dataset.pinned = String(SETTINGS.pinned.includes(p.id));
    chip.innerHTML = `
      ${p.icon ? `<img src="${p.icon}" alt="${p.name} icon" class="icon">` : ""}
      <span class="pin" title="Pin/unpin"></span>
      <strong>${p.name}</strong>
    `;
    chip.onclick = (ev) => {
      if ((ev.target as HTMLElement).classList.contains("pin")) {
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
    const id = (ch as HTMLElement).dataset.id;
    if (id && selectedIds.has(id)) {
      (ch as HTMLElement).dataset.selected = "true";
    }
  });
  // Also emphasize the single recommended one
  const recChip = chipsEl.querySelector(
    `.chip[data-id="${recId}"]`
  ) as HTMLElement;
  if (recChip) recChip.dataset.selected = "true";
  applyPinnedState();
}

function scorePct(label: string, scores: Record<string, number>): string {
  const v = scores[label];
  if (typeof v !== "number") return "";
  return `(${Math.round(v * 100)}%)`;
}

function togglePin(id: string): void {
  const idx = SETTINGS.pinned.indexOf(id);
  if (idx === -1) SETTINGS.pinned.push(id);
  else SETTINGS.pinned.splice(idx, 1);
  localStorage.setItem("pinnedProviders", JSON.stringify(SETTINGS.pinned));
  applyPinnedState();
}

function applyPinnedState(): void {
  chipsEl.querySelectorAll(".chip").forEach((ch) => {
    const element = ch as HTMLElement;
    if (element.dataset.id) {
      element.dataset.pinned = String(
        SETTINGS.pinned.includes(element.dataset.id)
      );
    }
  });
}

function selectedProvidersForQuery(q: string): string[] {
  const t = predictedType(q);
  if (t === "general" || t === "alias") return [];
  return PROVIDERS.filter(
    (p) => Array.isArray(p.types) && p.types.includes(t as ProviderType)
  ).map((p) => p.id);
}

function predictedType(q: string): string {
  if (MODEL.suggest && MODEL.ctx === normalize(q)) {
    return LABEL_TO_TYPE[MODEL.suggest as LabelType] || "general";
  }
  const heuristicType = classifyByHeuristics(q);
  return heuristicType || "general";
}

async function startClassification(q: string): Promise<void> {
  const id = Math.random().toString(36).slice(2);
  MODEL.inFlight = id;
  MODEL.ctx = normalize(q);

  try {
    mlEl.textContent = "ML classifying...";
    const pipeline = await initMLPipeline();

    if (!pipeline) {
      return;
    }

    const startTime = performance.now();

    let result;
    try {
      result = await pipeline(q, LABELS as any);
    } catch (e) {
      console.error("Pipeline classification error:", e);
      mlEl.textContent = "ML error";
      return;
    }

    const endTime = performance.now();

    if (MODEL.inFlight !== id) return;
    if (normalize(qEl.value) !== MODEL.ctx) return;

    // Process results as usual...
    const scores: Record<string, number> = {};
    result.scores.forEach((score: number, idx: number) => {
      scores[result.labels[idx]] = score;
    });

    MODEL.suggest = result.labels[0];
    MODEL.scores = scores;
    MODEL.runtime = Math.round(endTime - startTime);

    mlEl.textContent = `AI: ${MODEL.suggest} (${Math.round(
      scores[MODEL.suggest] * 100
    )}%) (${MODEL.runtime}ms)`;
    renderChips(qEl.value);
  } catch (error) {
    console.error("startClassification error:", error);
    mlEl.textContent = "ML error";
  }
}

function openRecommended(): void {
  const recId = recommendedProvider(qEl.value);
  const prov = providerById(recId) || providerById("kagi");
  if (prov) openUrl(makeUrl(prov, qEl.value));
}

function openPinned(): void {
  let list = selectedProvidersForQuery(qEl.value);
  if (list.length === 0) {
    list = [recommendedProvider(qEl.value)];
  }
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
