import re

# Keywords for priority classification
LOW_KEYWORDS = ["fan", "light", "minor", "suggestion", "classroom equipment", "bulb", "switch", "cleanliness", "dust", "dirt", "table", "chair"]
MEDIUM_KEYWORDS = ["repeated", "internet problem", "water problem", "hostel issue", "transport delay", "wifi", "wi-fi", "speed", "mess", "canteen", "bus", "network", "connectivity"]
HIGH_KEYWORDS = ["exam issue", "academic emergency", "repeated complaint", "serious infrastructure issue", "fees", "hall ticket", "grade", "results", "leaking", "flood", "broken door", "library", "scholarship"]
CRITICAL_KEYWORDS = ["harassment", "ragging", "threat", "violence", "safety", "assault", "emergency", "bully", "abuse", "suicidal", "steal", "theft", "weapon", "afraid", "scared"]

# Dictionary for sentiment analysis
NEGATIVE_WORDS = {
    "not", "bad", "worst", "broken", "terrible", "unsafe", "scared", "afraid", 
    "harassed", "fail", "delay", "poor", "unhappy", "angry", "frustrated", 
    "disappointed", "slow", "failed", "error", "issue", "problem", "hate", 
    "no", "harassment", "ragging", "violence", "abuse", "threat", "emergency"
}

POSITIVE_WORDS = {
    "good", "great", "excellent", "happy", "satisfied", "solved", "fixed", 
    "nice", "helpful", "thanks", "thank", "love", "awesome", "perfect", "resolved"
}

def preprocess_text(text):
    """Normalize text by converting to lowercase and removing punctuation."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text

def analyze_sentiment(text):
    """
    Simple dictionary-based sentiment analyzer.
    Returns: (sentiment_label, numerical_sentiment_score)
    """
    words = preprocess_text(text).split()
    
    neg_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    pos_count = sum(1 for word in words if word in POSITIVE_WORDS)
    
    total = neg_count + pos_count
    if total == 0:
        return "NEUTRAL", 0.0
    
    # Calculate score from -1.0 to 1.0
    score = (pos_count - neg_count) / total
    
    if score > 0.15:
        return "POSITIVE", score
    elif score < -0.15:
        return "NEGATIVE", score
    else:
        return "NEUTRAL", score

def analyze_complaint(text):
    """
    Analyzes complaint text to determine priority, sentiment, and category matching.
    Returns a dictionary of results.
    """
    clean_text = preprocess_text(text)
    
    # 1. Identify keyword matches in each category
    matched_low = [kw for kw in LOW_KEYWORDS if kw in clean_text]
    matched_medium = [kw for kw in MEDIUM_KEYWORDS if kw in clean_text]
    matched_high = [kw for kw in HIGH_KEYWORDS if kw in clean_text]
    matched_critical = [kw for kw in CRITICAL_KEYWORDS if kw in clean_text]
    
    # 2. Determine base priority and base score
    base_priority = "LOW"
    base_score = 0.20
    matched_keywords = []
    
    if matched_critical:
        base_priority = "CRITICAL"
        base_score = 0.85
        matched_keywords = matched_critical
    elif matched_high:
        base_priority = "HIGH"
        base_score = 0.65
        matched_keywords = matched_high
    elif matched_medium:
        base_priority = "MEDIUM"
        base_score = 0.45
        matched_keywords = matched_medium
    elif matched_low:
        base_priority = "LOW"
        base_score = 0.25
        matched_keywords = matched_low
    else:
        base_priority = "LOW"
        base_score = 0.15
        matched_keywords = []

    # 3. Analyze sentiment
    sentiment_label, sentiment_score = analyze_sentiment(text)
    
    # 4. Adjust priority score based on sentiment
    # Negative sentiment increases priority score, Positive sentiment decreases it
    final_score = base_score
    if sentiment_label == "NEGATIVE":
        final_score += 0.10
    elif sentiment_label == "POSITIVE":
        final_score -= 0.10
        
    # Clamp score between 0.05 and 0.99
    final_score = max(0.05, min(0.99, final_score))
    
    # 5. Classify final priority based on score
    if final_score >= 0.80:
        priority = "CRITICAL"
    elif final_score >= 0.60:
        priority = "HIGH"
    elif final_score >= 0.40:
        priority = "MEDIUM"
    else:
        priority = "LOW"
        
    # 6. Generate detailed reason
    if matched_keywords:
        keyword_str = ", ".join(f"'{kw}'" for kw in matched_keywords[:3])
        reason = f"Urgency keywords detected: {keyword_str}."
    else:
        reason = "General vocabulary detected with neutral context."
        
    if sentiment_label == "NEGATIVE":
        reason += " Sentiment is negative, indicating high frustration."
    elif sentiment_label == "POSITIVE":
        reason += " Sentiment is positive/constructive."
        
    return {
        "priority": priority,
        "score": round(final_score, 2),
        "sentiment": sentiment_label,
        "reason": reason
    }
