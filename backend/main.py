from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
import requests  # kept in case you later want real API

app = FastAPI()

# CORS so the frontend can call the API from file:// or http://
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in real app, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "hostaway_mock.json"
GOOGLE_MOCK_FILE = BASE_DIR / "data" / "google_mock.json"


def load_hostaway_raw() -> List[Dict[str, Any]]:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("result", [])


def make_listing_id(listing_name: str) -> str:
    # simple slug from listing name
    s = listing_name.lower()
    s = "".join(ch if ch.isalnum() or ch == " " else "-" for ch in s)
    s = "-".join(s.split())
    return s


def parse_to_iso(dt_str: str) -> str:
    # "2020-08-21 22:45:14" -> ISO
    return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S").isoformat() + "Z"


def compute_rating_out_of_10(
    rating: Optional[float], categories: Optional[List[Dict[str, Any]]]
) -> Optional[float]:
    if rating is not None:
        return float(rating)
    if not categories:
        return None
    vals = [c["rating"] for c in categories if "rating" in c]
    if not vals:
        return None
    return sum(vals) / len(vals)


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Super simple lexicon-based sentiment analysis:
    counts positive and negative words and returns a score + label.
    """
    if not text:
        return {"sentimentScore": 0.0, "sentimentLabel": "Neutral"}

    positive_words = {
        "amazing", "great", "good", "perfect", "smooth", "highly", "recommended",
        "comfortable", "quiet", "modern", "loved", "stunning", "clean", "spotless",
        "friendly", "wonderful", "excellent", "nice", "perfectly"
    }
    negative_words = {
        "bad", "poor", "slow", "noisy", "dirty", "delayed", "issue", "problem",
        "worst", "terrible", "awful", "disappointed", "rude"
    }

    words = [w.strip(".,!?:;").lower() for w in text.split()]
    score = 0
    for w in words:
        if w in positive_words:
            score += 1
        elif w in negative_words:
            score -= 1

    # simple normalization
    if score > 1:
        label = "Positive"
    elif score < -1:
        label = "Negative"
    else:
        # if score is small, treat as Neutral
        label = "Neutral"

    return {"sentimentScore": float(score), "sentimentLabel": label}


@app.get("/api/reviews/hostaway")
def get_hostaway_reviews():
    """
    Fetch and normalize Hostaway reviews from the mocked JSON file.
    """
    raw_reviews = load_hostaway_raw()

    normalized_reviews: List[Dict[str, Any]] = []
    listing_map: Dict[str, Dict[str, Any]] = {}

    for r in raw_reviews:
        listing_name = r["listingName"]
        listing_id = make_listing_id(listing_name)
        categories = r.get("reviewCategory") or []
        rating10 = compute_rating_out_of_10(r.get("rating"), categories)
        rating5 = round(rating10 / 2, 1) if rating10 is not None else None
        submitted_iso = parse_to_iso(r["submittedAt"])

        sentiment = analyze_sentiment(r.get("publicReview", ""))

        normalized = {
            "id": str(r["id"]),
            "source": "hostaway",
            "listingId": listing_id,
            "listingName": listing_name,
            "type": r.get("type"),
            "status": r.get("status"),
            "channel": r.get("channel", "hostaway"),
            "guestName": r.get("guestName"),
            "publicReview": r.get("publicReview", ""),
            "categories": categories,
            "ratingOutOf10": rating10,
            "ratingOutOf5": rating5,
            "submittedAt": submitted_iso,
            "approvedForWeb": False,
            "sentimentScore": sentiment["sentimentScore"],
            "sentimentLabel": sentiment["sentimentLabel"],
        }
        normalized_reviews.append(normalized)

        # build per-listing summary
        if listing_id not in listing_map:
            listing_map[listing_id] = {
                "listingId": listing_id,
                "listingName": listing_name,
                "reviewCount": 0,
                "lastReviewDate": None,
                "_ratings": [],
            }

        l = listing_map[listing_id]
        l["reviewCount"] += 1
        if l["lastReviewDate"] is None or submitted_iso > l["lastReviewDate"]:
            l["lastReviewDate"] = submitted_iso
        if rating5 is not None:
            l["_ratings"].append(rating5)

    listings_summary: List[Dict[str, Any]] = []
    for l in listing_map.values():
        ratings = l["_ratings"]
        avg = round(sum(ratings) / len(ratings), 1) if ratings else None
        listings_summary.append(
            {
                "listingId": l["listingId"],
                "listingName": l["listingName"],
                "reviewCount": l["reviewCount"],
                "lastReviewDate": l["lastReviewDate"],
                "avgRatingOutOf5": avg,
            }
        )

    return {
        "status": "success",
        "data": {
            "reviews": normalized_reviews,
            "listings": listings_summary,
        },
    }


@app.get("/api/reviews/google")
def get_google_reviews(place_id: str):
    """
    Returns MOCK Google Review data from google_mock.json, normalized into
    the same structure as Hostaway reviews.
    """
    if not GOOGLE_MOCK_FILE.exists():
        raise HTTPException(status_code=500, detail="google_mock.json not found")

    with open(GOOGLE_MOCK_FILE, "r", encoding="utf-8") as f:
        google_raw = json.load(f)

    result = google_raw.get("result", {})
    place_name = result.get("name", "Google Place")
    google_reviews = result.get("reviews", [])

    normalized_reviews: List[Dict[str, Any]] = []
    for idx, r in enumerate(google_reviews):
        rating5 = float(r.get("rating", 0.0))
        rating10 = rating5 * 2
        submitted_iso = datetime.utcfromtimestamp(r["time"]).isoformat() + "Z"

        sentiment = analyze_sentiment(r.get("text", ""))

        normalized_reviews.append(
            {
                "id": f"{place_id}-{idx}",
                "source": "google",
                "listingId": place_id,
                "listingName": place_name,
                "type": "guest-to-host",
                "status": "published",
                "channel": "google",
                "guestName": r.get("author_name"),
                "publicReview": r.get("text", ""),
                "categories": [],
                "ratingOutOf10": rating10,
                "ratingOutOf5": rating5,
                "submittedAt": submitted_iso,
                "approvedForWeb": False,
                "sentimentScore": sentiment["sentimentScore"],
                "sentimentLabel": sentiment["sentimentLabel"],
            }
        )

    ratings = [rv["ratingOutOf5"] for rv in normalized_reviews if rv["ratingOutOf5"]]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None
    last_date = max((rv["submittedAt"] for rv in normalized_reviews), default=None)

    listing_summary = {
        "listingId": place_id,
        "listingName": place_name,
        "reviewCount": len(normalized_reviews),
        "lastReviewDate": last_date,
        "avgRatingOutOf5": avg_rating,
    }

    return {
        "status": "success",
        "data": {
            "reviews": normalized_reviews,
            "listing": listing_summary,
        },
    }

# Run with:
# uvicorn main:app --reload
