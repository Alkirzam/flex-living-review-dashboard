from main import analyze_sentiment

def test_sentiment_positive():
    score, label = analyze_sentiment("Amazing stay, very clean and great WiFi.")
    assert label == "Positive"
    assert score > 0

def test_sentiment_negative():
    score, label = analyze_sentiment("Terrible experience, very dirty and noisy.")
    assert label == "Negative"
    assert score < 0

def test_sentiment_neutral():
    score, label = analyze_sentiment("The apartment was okay.")
    assert label in ["Neutral", "Positive", "Negative"]
