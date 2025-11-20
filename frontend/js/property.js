
//const API_BASE = "http://127.0.0.1:8000";
const API_BASE = "https://YOUR-BACKEND-URL.onrender.com";
const STORAGE_KEY = "flex-living-approvals";

function loadApprovalsProperty() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch (err) {
    console.error("Failed to load approvals:", err);
    return new Set();
  }
}

function getListingIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("listingId");
}

async function loadPropertyPage() {
  const listingId = getListingIdFromURL();
  if (!listingId) {
    alert(
      "Missing listingId in URL. Example: property.html?listingId=2b-n1-a---29-shoreditch-heights"
    );
    return;
  }

  const approvals = loadApprovalsProperty();

  const res = await fetch(API_BASE + "/api/reviews/hostaway");
  const json = await res.json();

  const allReviews = json.data.reviews;
  const propertyReviews = allReviews.filter((r) => r.listingId === listingId);

  const approvedReviews = propertyReviews.filter((r) =>
    approvals.has(String(r.id))
  );

  const titleEl = document.getElementById("property-title");
  if (propertyReviews.length > 0) {
    titleEl.textContent = propertyReviews[0].listingName;
  } else {
    titleEl.textContent = "Property";
  }

  const container = document.getElementById("reviews-container");
  container.innerHTML = "";

  if (approvedReviews.length === 0) {
    const p = document.createElement("p");
    p.textContent = "There are no guest reviews to display yet.";
    container.appendChild(p);
    return;
  }

  approvedReviews.forEach((r) => {
    const sentiment = r.sentimentLabel || "Neutral";
    let sentimentColor = "#6b7280";
    if (sentiment === "Positive") sentimentColor = "#15803d";
    else if (sentiment === "Negative") sentimentColor = "#b91c1c";

    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <strong>${r.guestName || "Guest"}</strong>
        <span style="color:#6b7280;font-size:12px;">${r.submittedAt.slice(
          0,
          10
        )}</span>
      </div>
      ${
        r.ratingOutOf5
          ? `<div style="color:#92400e;font-size:12px;margin-bottom:4px;">${r.ratingOutOf5.toFixed(
              1
            )} / 5</div>`
          : ""
      }
      <div style="font-size:11px; margin-bottom:4px; color:${sentimentColor};">
        Sentiment: ${sentiment}
      </div>
      <p style="margin:0 0 4px;">${r.publicReview}</p>
    `;
    container.appendChild(card);
  });
}

loadPropertyPage();
