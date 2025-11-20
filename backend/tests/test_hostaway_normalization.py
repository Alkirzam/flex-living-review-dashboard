def test_hostaway_normalization(client):
    response = client.get("/api/reviews/hostaway")
    assert response.status_code == 200

    data = response.json()["data"]
    reviews = data["reviews"]
    listings = data["listings"]

    assert isinstance(reviews, list)
    assert isinstance(listings, list)
    assert "listingId" in listings[0]
    assert "ratingOutOf5" in reviews[0]

    # Check date normalization
    assert reviews[0]["submittedAt"].endswith("Z")
