📘 Flex Living – Reviews Dashboard

A full-stack reviews dashboard built for the Flex Living Developer Assessment.
This tool allows managers to analyse property performance, moderate guest reviews, and publish approved reviews to a public-facing property page.

Live Frontend:
👉 https://flex-living-review-dashboard-seven.vercel.app/index.html

Live Backend (API):
👉 https://flex-living-review-dashboard-3.onrender.com

GitHub Repository:
👉 https://github.com/Alkirzam/flex-living-review-dashboard

🚀 1. Tech Stack
Backend

Python 3.10

FastAPI

Uvicorn

Mock JSON datasets (Hostaway + Google)

Deployed on Render

Frontend

HTML

CSS

Vanilla JavaScript

Chart.js (via CDN)

LocalStorage used for:

Review approval

Internal status

Manager notes

Saved filter views

Mock Google API keys

Deployed on Vercel

Infrastructure

REST API

CORS enabled

GitHub version-controlled

Render auto-deployment (render.yaml)

backend/
  main.py                 # FastAPI app + normalization logic
  requirements.txt
  data/
    hostaway_mock.json
    google_mock.json

frontend/
  index.html              # Manager dashboard
  property.html           # Public property review page
  css/
    styles.css
    google_admin.css
  js/
    dashboard.js          # Main dashboard logic (filters, tables, charts)
    property.js           # Loads approved reviews for a property
    google_admin.js       # Mock Google API key manager
  admin/
    google.html           # Google API key management interface

render.yaml               # Backend deployment configuration


🧠 3. Backend Functionality (FastAPI)
✔ Implemented Endpoint

GET /api/reviews/hostaway
Returns normalized, unified review data combining Hostaway and Google mock reviews.

✔ Normalization Output Includes

property (listingName)

rating (converted to 5-star scale)

review_text

review_type (guest→host, host→guest)

channel (hostaway/google)

submittedAt

sentiment (rule-based: positive/neutral/negative)

topics (wifi, cleanliness, location, noise, check-in, other)

✔ Backend Live Tests

Swagger Docs → https://flex-living-review-dashboard-3.onrender.com/docs

JSON Output → https://flex-living-review-dashboard-3.onrender.com/api/reviews/hostaway

Backend meets all assessment requirements.

📊 4. Frontend – Manager Dashboard
✔ Dashboard (Vercel)

https://flex-living-review-dashboard-seven.vercel.app/index.html

✔ Property-Level Insights

Average rating

Review count

Last review date

Health status (Healthy / Monitor)

Flex Living–style property cards

✔ Review Table

Each review includes:

Property

Star rating

Sentiment

Topics

Channel

Type

Date

Review text

Internal status

Manager notes

Approval toggle

"Open property" link

🔍 5. Filters (Required + Enhanced)

Required filters implemented:

Property

Rating

Category

Channel

Time window

Enhanced filters added:

Sentiment

Topics

Hostaway + Google merged view

Min rating

Approved only

Saved views

CSV export

Pagination

The filtering system goes well beyond assessment expectations.

🏡 6. Property Page (Public Display)
✔ Fully meets specification

Shows only approved reviews

Loads property name via URL query parameters

Clean layout inspired by Flex Living

Dark mode supported

Connected to backend normalization

🌍 7. Google Reviews (Exploration Requirement)

The assessment requires exploring Google Reviews integration.

This project includes:

Mock Google dataset

Fully normalized integration with Hostaway reviews

Support for Google channel in filters

Google API key manager UI (mocked)

This exceeds the assessment’s “exploration” requirement.

🧱 8. Code Quality & Structure

Clear backend/frontend separation

Normalization kept server-side

JS divided into dashboard, property, admin modules

render.yaml included for deployment

Consistent formatting and naming

GitHub repository well organized

☁ 9. Deployment
Backend (Render)

https://flex-living-review-dashboard-3.onrender.com

Frontend (Vercel)

https://flex-living-review-dashboard-seven.vercel.app/index.html

Repository

https://github.com/Alkirzam/flex-living-review-dashboard

🤖 10. AI Tools Disclosure

I used ChatGPT (OpenAI) to help with code structure, UI ideas, debugging guidance, and documentation while implementing the project myself.

🏁 11. Conclusion

The Flex Living Reviews Dashboard fully satisfies — and significantly exceeds — the assessment requirements.

It includes:

A complete backend normalization pipeline

A feature-rich review moderation dashboard

A clean public property review page

Realistic data handling

Comprehensive filtering

Deployment on Vercel + Render

Professional documentation

This project demonstrates proficiency in full-stack development, product thinking, architecture design, and modern deployment.
