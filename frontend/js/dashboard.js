
// const API_BASE = "http://127.0.0.1:8000";
const API_BASE = "https://YOUR-BACKEND-URL.onrender.com";
const STORAGE_KEY = "flex-living-approvals";
const DARK_MODE_KEY = "flex-dark-mode";
const FILTER_VIEWS_KEY = "flex-filter-views";
const STATUS_STORAGE_KEY = "flex-review-statuses";
const NOTES_STORAGE_KEY = "flex-review-notes";

const PAGE_SIZE = 8;

let hostawayReviews = [];
let googleReviews = [];
let allReviews = [];
let listingSummaries = [];
let approvals = new Set();
let statuses = {};
let notes = {};
let currentPage = 1;

// Charts
let ratingChart = null;
let countChart = null;

/* ---- Approvals ---- */

function loadApprovals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    approvals = new Set(arr);
  } catch (err) {
    console.error("Failed to load approvals:", err);
  }
}

function saveApprovals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(approvals)));
}

/* ---- Status & notes ---- */

function loadStatuses() {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    statuses = raw ? JSON.parse(raw) : {};
  } catch {
    statuses = {};
  }
}

function saveStatuses() {
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    notes = raw ? JSON.parse(raw) : {};
  } catch {
    notes = {};
  }
}

function saveNotes() {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

/* ---- Dark mode ---- */

function applyDarkModeFromStorage() {
  const mode = localStorage.getItem(DARK_MODE_KEY);
  if (mode === "on") {
    document.body.classList.add("dark");
    const btn = document.getElementById("dark-mode-toggle");
    if (btn) btn.textContent = "☀ Light mode";
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  const btn = document.getElementById("dark-mode-toggle");
  if (btn) btn.textContent = isDark ? "☀ Light mode" : "🌙 Dark mode";
  localStorage.setItem(DARK_MODE_KEY, isDark ? "on" : "off");
}

/* ---- Topic extraction ---- */

function extractTopics(text) {
  if (!text) return ["Other"];
  const lower = text.toLowerCase();
  const topics = [];

  if (lower.includes("wifi") || lower.includes("wi-fi") || lower.includes("internet")) {
    topics.push("WiFi");
  }
  if (lower.includes("clean") || lower.includes("dirty") || lower.includes("spotless")) {
    topics.push("Cleanliness");
  }
  if (lower.includes("location") || lower.includes("central") || lower.includes("near")) {
    topics.push("Location");
  }
  if (
    lower.includes("check in") ||
    lower.includes("check-in") ||
    lower.includes("checkin") ||
    lower.includes("check out") ||
    lower.includes("check-out") ||
    lower.includes("checkout") ||
    lower.includes("arrival") ||
    lower.includes("key collection")
  ) {
    topics.push("Check-in");
  }
  if (
    lower.includes("noise") ||
    lower.includes("noisy") ||
    lower.includes("loud") ||
    lower.includes("quiet")
  ) {
    topics.push("Noise");
  }
  if (
    lower.includes("staff") ||
    lower.includes("host") ||
    lower.includes("team") ||
    lower.includes("service")
  ) {
    topics.push("Staff");
  }

  if (topics.length === 0) topics.push("Other");
  return Array.from(new Set(topics));
}

/* ---- Fetch and init ---- */

async function loadReviews() {
  loadApprovals();
  loadStatuses();
  loadNotes();
  applyDarkModeFromStorage();

  // 1) Hostaway (mock data)
  const res = await fetch(API_BASE + "/api/reviews/hostaway");
  const json = await res.json();

  listingSummaries = json.data.listings;
  hostawayReviews = json.data.reviews.map((r) => ({
    ...r,
    topics: extractTopics(r.publicReview || ""),
  }));

  // 2) Google (mock data from /api/reviews/google)
  try {
    const gRes = await fetch(
      API_BASE + "/api/reviews/google?place_id=flex-shoreditch"
    );
    if (gRes.ok) {
      const gJson = await gRes.json();
      if (gJson.status === "success") {
        googleReviews = gJson.data.reviews.map((r) => ({
          ...r,
          topics: extractTopics(r.publicReview || ""),
        }));
        const gListing = gJson.data.listing;
        if (gListing) {
          listingSummaries.push(gListing);
        }
      } else {
        console.warn("Google mock error:", gJson);
      }
    }
  } catch (err) {
    console.warn("Failed to load Google mock reviews:", err);
  }

  // Combined reviews (Hostaway + Google)
  allReviews = hostawayReviews.concat(googleReviews);

  renderListingCards();
  initFilters();
  initDarkModeToggle();
  initExportButton();
  initPaginationControls();
  initSavedViews();
  renderReviewsTable();
  initCharts();
}

/* ---- Summary cards + health ---- */

function computeHealthStatus(listing) {
  const reviewsForListing = allReviews.filter(
    (r) => r.listingId === listing.listingId
  );
  const negativeCount = reviewsForListing.filter(
    (r) => r.sentimentLabel === "Negative"
  ).length;
  const avg = listing.avgRatingOutOf5 || 0;

  if (avg >= 4.5 && negativeCount === 0) return "Healthy";
  if (avg < 4 || negativeCount >= 2) return "Needs attention";
  return "Monitor";
}

function healthBadgeClass(status) {
  if (status === "Healthy") return "badge health-good";
  if (status === "Needs attention") return "badge health-bad";
  return "badge health-medium";
}

function renderListingCards() {
  const container = document.getElementById("listing-summary");
  container.innerHTML = "";

  listingSummaries.forEach((l) => {
    const div = document.createElement("div");
    div.className = "card";

    const rating = l.avgRatingOutOf5;
    const health = computeHealthStatus(l);

    div.innerHTML = `
      <div class="card-title">${l.listingName}</div>
      <div class="card-sub">Short-stay serviced apartment</div>
      <div class="card-metrics">
        <span class="badge">
          ${rating != null ? rating.toFixed(1) : "—"} / 5
        </span>
        <span>${l.reviewCount} reviews</span>
        <span>Last: ${
          l.lastReviewDate ? l.lastReviewDate.slice(0, 10) : "—"
        }</span>
        <span class="${healthBadgeClass(health)}">${health}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

/* ---- Filters ---- */

function initFilters() {
  const listingSelect = document.getElementById("filter-listing");
  const channelSelect = document.getElementById("filter-channel");
  const typeSelect = document.getElementById("filter-type");
  const minRatingInput = document.getElementById("filter-min-rating");
  const onlyApprovedCheckbox = document.getElementById("filter-only-approved");
  const sourceSelect = document.getElementById("filter-source");
  const sentimentSelect = document.getElementById("filter-sentiment");
  const topicSelect = document.getElementById("filter-topic");
  const timeSelect = document.getElementById("filter-time");

  // Fill property options
  listingSummaries.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.listingId;
    opt.textContent = l.listingName;
    listingSelect.appendChild(opt);
  });

  // Fill channel options (hostaway + google)
  const channels = Array.from(new Set(allReviews.map((r) => r.channel)));
  channels.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    channelSelect.appendChild(opt);
  });

  [
    listingSelect,
    channelSelect,
    typeSelect,
    minRatingInput,
    onlyApprovedCheckbox,
    sourceSelect,
    sentimentSelect,
    topicSelect,
    timeSelect,
  ].forEach((el) => {
    el.addEventListener("change", () => {
      currentPage = 1;
      renderReviewsTable();
    });
  });
}

/* ---- Dark mode button ---- */

function initDarkModeToggle() {
  const btn = document.getElementById("dark-mode-toggle");
  if (btn) {
    btn.addEventListener("click", toggleDarkMode);
  }
}

/* ---- Star & sentiment & topics ---- */

function renderStars(rating) {
  if (rating == null) return "";
  const full = Math.round(rating); // out of 5
  let stars = "";
  for (let i = 0; i < 5; i++) {
    stars += i < full ? "★" : "☆";
  }
  return `<span class="stars">${stars}</span>`;
}

function renderSentimentBadge(label) {
  if (!label) return "";
  let cls = "sentiment-neutral";
  if (label === "Positive") cls = "sentiment-positive";
  else if (label === "Negative") cls = "sentiment-negative";
  return `<span class="sentiment-badge ${cls}">${label}</span>`;
}

function renderTopics(topics) {
  if (!topics || topics.length === 0) return "";
  return topics
    .map((t) => `<span class="topic-badge">${t}</span>`)
    .join(" ");
}

/* ---- Filters state ---- */

function getFiltersFromDOM() {
  const listingId = document.getElementById("filter-listing").value;
  const channel = document.getElementById("filter-channel").value;
  const type = document.getElementById("filter-type").value;
  const minRatingRaw = document.getElementById("filter-min-rating").value;
  const onlyApproved = document.getElementById("filter-only-approved").checked;
  const source = document.getElementById("filter-source").value;
  const sentiment = document.getElementById("filter-sentiment").value;
  const topic = document.getElementById("filter-topic").value;
  const timeRange = document.getElementById("filter-time").value;

  const minRating = minRatingRaw ? Number(minRatingRaw) : null;

  return {
    listingId,
    channel,
    type,
    minRating,
    onlyApproved,
    source,
    sentiment,
    topic,
    timeRange,
  };
}

/* ---- Filter reviews in memory ---- */

function getFilteredReviews() {
  const filters = getFiltersFromDOM();

  // Pick base according to source filter
  let base = allReviews;
  if (filters.source === "hostaway") {
    base = allReviews.filter((r) => r.source === "hostaway");
  } else if (filters.source === "google") {
    base = allReviews.filter((r) => r.source === "google");
  }

  const now = new Date();

  return base
    .map((r) => ({
      ...r,
      approvedForWeb: approvals.has(r.id),
      status: statuses[r.id] || "New",
      note: notes[r.id] || "",
    }))
    .filter((r) => {
      if (filters.listingId !== "all" && r.listingId !== filters.listingId) {
        return false;
      }
      if (filters.channel !== "all" && r.channel !== filters.channel) {
        return false;
      }
      if (filters.type !== "all" && r.type !== filters.type) {
        return false;
      }
      if (
        filters.minRating !== null &&
        (r.ratingOutOf5 || 0) < filters.minRating
      ) {
        return false;
      }
      if (filters.onlyApproved && !approvals.has(r.id)) {
        return false;
      }
      if (
        filters.sentiment !== "all" &&
        (r.sentimentLabel || "Neutral") !== filters.sentiment
      ) {
        return false;
      }
      if (filters.topic !== "all") {
        if (!r.topics || !r.topics.includes(filters.topic)) return false;
      }

      if (filters.timeRange !== "all") {
        const reviewDate = new Date(r.submittedAt);
        if (isNaN(reviewDate.getTime())) return false;
        const diffMs = now - reviewDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (filters.timeRange === "last_30" && diffDays > 30) return false;
        if (filters.timeRange === "last_90" && diffDays > 90) return false;
      }

      return true;
    });
}

/* ---- Approvals ---- */

function toggleApproval(reviewId) {
  if (approvals.has(reviewId)) {
    approvals.delete(reviewId);
  } else {
    approvals.add(reviewId);
  }
  saveApprovals();
  renderReviewsTable();
}

/* ---- Pagination controls ---- */

function initPaginationControls() {
  const prev = document.getElementById("page-prev");
  const next = document.getElementById("page-next");

  if (prev) {
    prev.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderReviewsTable();
      }
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      const total = getFilteredReviews().length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (currentPage < totalPages) {
        currentPage++;
        renderReviewsTable();
      }
    });
  }
}

/* ---- Render reviews table ---- */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderReviewsTable() {
  const tbody = document.getElementById("reviews-tbody");
  const pageInfo = document.getElementById("page-info");
  const prev = document.getElementById("page-prev");
  const next = document.getElementById("page-next");

  tbody.innerHTML = "";

  const filtered = getFilteredReviews();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filtered.slice(start, end);

  if (total === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 12;
    td.textContent = "No reviews match your filters.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    pageItems.forEach((r) => {
      const tr = document.createElement("tr");

      const approved = approvals.has(r.id);
      const typeLabel =
        r.type === "guest-to-host" ? "Guest → Host" : "Host → Guest";
      const shortNote =
        r.note && r.note.length > 60 ? r.note.slice(0, 57) + "..." : r.note;

      tr.innerHTML = `
        <td>${r.listingName}</td>
        <td>
          ${
            r.ratingOutOf5
              ? `${r.ratingOutOf5.toFixed(1)} / 5<br>${renderStars(
                  r.ratingOutOf5
                )}`
              : "—"
          }
        </td>
        <td>${renderSentimentBadge(r.sentimentLabel)}</td>
        <td>${renderTopics(r.topics)}</td>
        <td>${r.channel}</td>
        <td>${typeLabel}</td>
        <td>${r.submittedAt.slice(0, 10)}</td>
        <td>${escapeHtml(r.publicReview || "")}</td>
        <td>
          <select class="status-select" data-id="${r.id}">
            <option value="New" ${r.status === "New" ? "selected" : ""}>New</option>
            <option value="Under review" ${
              r.status === "Under review" ? "selected" : ""
            }>Under review</option>
            <option value="Resolved" ${
              r.status === "Resolved" ? "selected" : ""
            }>Resolved</option>
            <option value="Ignored" ${
              r.status === "Ignored" ? "selected" : ""
            }>Ignored</option>
          </select>
        </td>
        <td>
          <button class="tag-button note-btn" data-id="${r.id}">
            ${r.note ? "Edit note" : "Add note"}
          </button>
          ${
            r.note
              ? `<div class="note-preview">${escapeHtml(shortNote)}</div>`
              : ""
          }
        </td>
        <td>
          <button
            class="tag-button ${approved ? "approved" : "not-approved"}"
            data-id="${r.id}"
          >
            ${approved ? "Approved" : "Not approved"}
          </button>
        </td>
        <td>
          <a href="property.html?listingId=${encodeURIComponent(
            r.listingId
          )}" target="_blank">
            Open
          </a>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // approve / unapprove buttons (exclude note-btn)
    tbody.querySelectorAll("button[data-id].tag-button").forEach((btn) => {
      if (btn.classList.contains("note-btn")) return;
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        toggleApproval(id);
      });
    });

    // status change
    tbody.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        const id = sel.getAttribute("data-id");
        const val = sel.value;
        statuses[id] = val;
        saveStatuses();
      });
    });

    // note editing
    tbody.querySelectorAll(".note-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const currentNote = notes[id] || "";
        const text = prompt("Internal note for this review:", currentNote);
        if (text === null) return;
        notes[id] = text.trim();
        if (!notes[id]) delete notes[id];
        saveNotes();
        renderReviewsTable();
      });
    });
  }

  // Pagination info
  if (pageInfo) {
    if (total === 0) {
      pageInfo.textContent = "0 reviews";
    } else {
      pageInfo.textContent = `Page ${currentPage} of ${totalPages} • ${total} review(s)`;
    }
  }
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

/* ---- Export CSV ---- */

function initExportButton() {
  const btn = document.getElementById("export-csv-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const data = getFilteredReviews();
    if (data.length === 0) {
      alert("No reviews to export for the current view.");
      return;
    }

    const headers = [
      "id",
      "listingName",
      "channel",
      "type",
      "ratingOutOf5",
      "sentimentLabel",
      "topics",
      "submittedAt",
      "publicReview",
      "status",
      "note",
      "approvedForWeb",
    ];

    const rows = [headers.join(",")];

    data.forEach((r) => {
      const row = [
        r.id,
        `"${(r.listingName || "").replace(/"/g, '""')}"`,
        r.channel || "",
        r.type || "",
        r.ratingOutOf5 != null ? r.ratingOutOf5.toString() : "",
        r.sentimentLabel || "",
        `"${(r.topics || []).join("|").replace(/"/g, '""')}"`,
        r.submittedAt,
        `"${(r.publicReview || "").replace(/"/g, '""')}"`,
        r.status || "",
        `"${(r.note || "").replace(/"/g, '""')}"`,
        approvals.has(r.id) ? "yes" : "no",
      ];
      rows.push(row.join(","));
    });

    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flex_reviews_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

/* ---- Saved views ---- */

function loadFilterViews() {
  try {
    const raw = localStorage.getItem(FILTER_VIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFilterViews(views) {
  localStorage.setItem(FILTER_VIEWS_KEY, JSON.stringify(views));
}

function initSavedViews() {
  const nameInput = document.getElementById("saved-view-name");
  const saveBtn = document.getElementById("save-view-btn");
  const select = document.getElementById("saved-views-select");
  const applyBtn = document.getElementById("apply-view-btn");
  const deleteBtn = document.getElementById("delete-view-btn");

  if (!nameInput || !saveBtn || !select || !applyBtn || !deleteBtn) return;

  let views = loadFilterViews();

  function renderSelect() {
    select.innerHTML = `<option value="">Saved views…</option>`;
    views.forEach((v, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = v.name;
      select.appendChild(opt);
    });
  }

  renderSelect();

  saveBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert("Please enter a name for the view.");
      return;
    }
    const filters = getFiltersFromDOM();

    const existingIndex = views.findIndex(
      (v) => v.name.toLowerCase() === name.toLowerCase()
    );
    const viewObj = { name, filters };

    if (existingIndex >= 0) {
      views[existingIndex] = viewObj;
    } else {
      views.push(viewObj);
    }
    saveFilterViews(views);
    renderSelect();
    nameInput.value = "";
  });

  applyBtn.addEventListener("click", () => {
    const idx = select.value;
    if (idx === "") return;
    const view = views[Number(idx)];
    if (!view) return;
    const f = view.filters;

    document.getElementById("filter-listing").value = f.listingId;
    document.getElementById("filter-channel").value = f.channel;
    document.getElementById("filter-type").value = f.type;
    document.getElementById("filter-source").value = f.source;
    document.getElementById("filter-sentiment").value = f.sentiment;
    document.getElementById("filter-topic").value = f.topic;
    document.getElementById("filter-time").value = f.timeRange || "all";
    document.getElementById("filter-min-rating").value =
      f.minRating != null ? String(f.minRating) : "";
    document.getElementById("filter-only-approved").checked = f.onlyApproved;

    currentPage = 1;
    renderReviewsTable();
  });

  deleteBtn.addEventListener("click", () => {
    const idx = select.value;
    if (idx === "") return;
    views.splice(Number(idx), 1);
    saveFilterViews(views);
    renderSelect();
  });
}

/* ---- Charts ---- */

function initCharts() {
  const ratingCtx = document.getElementById("chart-rating-per-property");
  const countCtx = document.getElementById("chart-count-per-property");

  if (!ratingCtx || !countCtx || !window.Chart) return;

  const labels = listingSummaries.map((l) => l.listingName);
  const avgRatings = listingSummaries.map((l) => l.avgRatingOutOf5 || 0);
  const counts = listingSummaries.map((l) => l.reviewCount || 0);

  if (ratingChart) ratingChart.destroy();
  if (countChart) countChart.destroy();

  ratingChart = new Chart(ratingCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Avg rating (/5)",
          data: avgRatings,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
        },
      },
    },
  });

  countChart = new Chart(countCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Review count",
          data: counts,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

/* ---- Run on page load ---- */

loadReviews();
