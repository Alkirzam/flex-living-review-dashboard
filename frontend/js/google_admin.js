const GOOGLE_KEYS_STORAGE = "google-api-keys";

function normalizeKeys(raw) {
  if (!Array.isArray(raw)) return [];
  const normalized = [];
  raw.forEach((item, idx) => {
    if (typeof item === "string") {
      normalized.push({
        id: Date.now() + idx,
        name: `Key ${idx + 1}`,
        value: item,
        createdAt: new Date().toISOString(),
        isDefault: idx === 0,
      });
    } else if (item && typeof item === "object" && item.value) {
      normalized.push({
        id: item.id || Date.now() + idx,
        name: item.name || `Key ${idx + 1}`,
        value: item.value,
        createdAt: item.createdAt || new Date().toISOString(),
        isDefault: !!item.isDefault,
      });
    }
  });
  return normalized;
}

function loadKeys() {
  try {
    const raw = localStorage.getItem(GOOGLE_KEYS_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeKeys(parsed);
  } catch {
    return [];
  }
}

function saveKeys(keys) {
  localStorage.setItem(GOOGLE_KEYS_STORAGE, JSON.stringify(keys));
}

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 8) return key;
  return key.slice(0, 4) + "..." + key.slice(-4);
}

function formatDate(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function renderKeys(keys) {
  const container = document.getElementById("keys-list");
  container.innerHTML = "";

  if (keys.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No keys saved yet.";
    p.style.fontSize = "12px";
    p.style.color = "#6b7280";
    container.appendChild(p);
    return;
  }

  keys.forEach((k) => {
    const div = document.createElement("div");
    div.className = "key-card";

    div.innerHTML = `
      <div class="key-main">
        <div class="key-name">
          ${k.name}
          ${k.isDefault ? '<span class="badge-default">Default</span>' : ""}
        </div>
        <div class="key-meta">
          ${maskKey(k.value)} • added ${formatDate(k.createdAt)}
        </div>
      </div>
      <div class="key-actions">
        <button class="btn" data-action="default" data-id="${k.id}">
          Set default
        </button>
        <button class="btn" data-action="delete" data-id="${k.id}">
          Delete
        </button>
        <button class="btn" data-action="test" data-id="${k.id}">
          Test (mock)
        </button>
      </div>
    `;

    container.appendChild(div);
  });

  container.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      handleKeyAction(action, id);
    });
  });
}

let currentKeys = loadKeys();
renderKeys(currentKeys);

function handleKeyAction(action, id) {
  const idx = currentKeys.findIndex((k) => String(k.id) === String(id));
  if (idx === -1) return;

  if (action === "delete") {
    currentKeys.splice(idx, 1);
    // if default removed, clear defaults
    if (!currentKeys.some((k) => k.isDefault)) {
      if (currentKeys[0]) currentKeys[0].isDefault = true;
    }
    saveKeys(currentKeys);
    renderKeys(currentKeys);
  } else if (action === "default") {
    currentKeys = currentKeys.map((k) => ({
      ...k,
      isDefault: String(k.id) === String(id),
    }));
    saveKeys(currentKeys);
    renderKeys(currentKeys);
  } else if (action === "test") {
    const key = currentKeys[idx].value;
    runMockTest(key);
  }
}

/* ---- Add key form ---- */

document.getElementById("add-key-btn").addEventListener("click", () => {
  const labelInput = document.getElementById("key-label");
  const valueInput = document.getElementById("key-value");

  const name = (labelInput.value || "").trim() || `Key ${currentKeys.length + 1}`;
  const value = (valueInput.value || "").trim();

  if (!value) {
    alert("Please enter an API key value.");
    return;
  }

  const keyObj = {
    id: Date.now(),
    name,
    value,
    createdAt: new Date().toISOString(),
    isDefault: currentKeys.length === 0,
  };

  currentKeys.push(keyObj);
  saveKeys(currentKeys);
  renderKeys(currentKeys);

  labelInput.value = "";
  valueInput.value = "";
});

/* ---- Mock test ---- */

function runMockTest(keyValue) {
  const placeId = document.getElementById("test-place-id").value.trim() || "flex-shoreditch";
  const resultEl = document.getElementById("test-result");

  const masked = maskKey(keyValue);

  const payload = {
    status: "mock",
    message:
      "This is a mocked test. In the real environment this key would be sent to the backend, which would call Google Places API.",
    usedKey: masked,
    exampleBackendCall: "/api/reviews/google?place_id=" + placeId + "&apiKey=YOUR_KEY",
  };

  resultEl.textContent = JSON.stringify(payload, null, 2);
}

document.getElementById("test-default-btn").addEventListener("click", () => {
  const resultEl = document.getElementById("test-result");
  if (currentKeys.length === 0) {
    resultEl.textContent = "No keys available. Please add a key first.";
    return;
  }
  const def = currentKeys.find((k) => k.isDefault) || currentKeys[0];
  runMockTest(def.value);
});
