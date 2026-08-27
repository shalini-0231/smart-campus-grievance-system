import re
from datetime import datetime

# Keywords for priority classification
LOW_KEYWORDS = ["fan", "light", "minor", "suggestion", "classroom equipment", "bulb", "switch", "cleanliness", "dust", "dirt", "table", "chair"]
MEDIUM_KEYWORDS = ["repeated", "internet problem", "water problem", "hostel issue", "transport delay", "wifi", "wi-fi", "speed", "mess", "canteen", "bus", "network", "connectivity", "od form", "on duty", "attendance not updated", "event approval", "mentor sign", "hod sign", "class counsellor", "class presentation", "od cell", "symposium", "conference", "fake od", "dish", "food", "meal", "overpriced", "unavailable", "menu"]
HIGH_KEYWORDS = ["exam issue", "academic emergency", "repeated complaint", "serious infrastructure issue", "fees", "hall ticket", "grade", "results", "leaking", "flood", "broken door", "library", "scholarship", "hygiene", "foreign object", "cockroach", "insect", "stale food", "fly", "dirty food", "food poisoning", "hair in food"]
CRITICAL_KEYWORDS = ["harassment", "ragging", "threat", "violence", "safety", "assault", "emergency", "bully", "abuse", "suicidal", "steal", "theft", "weapon", "afraid", "scared"]

# Dictionary for sentiment analysis
NEGATIVE_WORDS = {
    "not", "bad", "worst", "broken", "terrible", "unsafe", "scared", "afraid", 
    "harassed", "fail", "delay", "poor", "unhappy", "angry", "frustrated", 
    "disappointed", "slow", "failed", "error", "issue", "problem", "hate", 
    "no", "harassment", "ragging", "violence", "abuse", "threat", "emergency",
    "rejected", "unapproved", "pending", "missing"
}

POSITIVE_WORDS = {
    "good", "great", "excellent", "happy", "satisfied", "solved", "fixed", 
    "nice", "helpful", "thanks", "thank", "love", "awesome", "perfect", "resolved",
    "approved"
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

def analyze_complaint(text, event_date_str=None, issue_type=None):
    """
    Analyzes complaint text to determine priority, sentiment, and category matching.
    Optionally evaluates event_date_str for OD escalation or issue_type for food safety override.
    Returns a dictionary of results.
    """
    clean_text = preprocess_text(text)
    
    # 1. Identify keyword matches in each category
    matched_low = [kw for kw in LOW_KEYWORDS if kw in clean_text]
    matched_medium = [kw for kw in MEDIUM_KEYWORDS if kw in clean_text]
    matched_high = [kw for kw in HIGH_KEYWORDS if kw in clean_text]
    matched_critical = [kw for kw in CRITICAL_KEYWORDS if kw in clean_text]
    
    # Check if event date has passed
    is_past_event = False
    if event_date_str:
        try:
            # Handle YYYY-MM-DD or ISO string
            date_part = event_date_str.split('T')[0]
            parsed_date = datetime.strptime(date_part, "%Y-%m-%d")
            if parsed_date < datetime.now():
                is_past_event = True
        except Exception:
            pass

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
        # Time-sensitive OD escalation if event date has passed
        if is_past_event:
            base_priority = "HIGH"
            base_score = 0.70
        else:
            base_priority = "MEDIUM"
            base_score = 0.45
        matched_keywords = matched_medium
    elif matched_low:
        base_priority = "LOW"
        base_score = 0.25
        matched_keywords = matched_low
    else:
        if is_past_event:
            base_priority = "MEDIUM"
            base_score = 0.45
        else:
            base_priority = "LOW"
            base_score = 0.15
        matched_keywords = []

    # 3. Analyze sentiment
    sentiment_label, sentiment_score = analyze_sentiment(text)
    
    # 4. Adjust priority score based on sentiment
    final_score = base_score
    if sentiment_label == "NEGATIVE":
        final_score += 0.10
    elif sentiment_label == "POSITIVE":
        final_score -= 0.10
        
    # Clamp score between 0.05 and 0.99
    final_score = max(0.05, min(0.99, final_score))
    
    # 5. Classify final priority based on score (with Food Safety Health Override)
    food_safety_override = False
    override_priority = None

    critical_food_keywords = ["foreign object", "cockroach", "insect", "poison", "hair in food", "glass in food"]
    high_food_keywords = ["hygiene", "stale food", "dirty food", "unhygiene", "spoiled food"]

    if issue_type == "FOREIGN_OBJECT" or any(kw in clean_text for kw in critical_food_keywords):
        food_safety_override = True
        override_priority = "CRITICAL"
        final_score = 0.90
    elif issue_type == "HYGIENE" or any(kw in clean_text for kw in high_food_keywords):
        food_safety_override = True
        override_priority = "HIGH"
        final_score = max(final_score, 0.75)

    if food_safety_override:
        priority = override_priority
    elif final_score >= 0.80:
        priority = "CRITICAL"
    elif final_score >= 0.60:
        priority = "HIGH"
    elif final_score >= 0.40:
        priority = "MEDIUM"
    else:
        priority = "LOW"
        
    # 6. Generate detailed reason
    if food_safety_override:
        reason = f"[ALERT] Food Safety Priority Override: Escalated due to health and food safety concern ({issue_type or priority})."
    elif matched_keywords:
        keyword_str = ", ".join(f"'{kw}'" for kw in matched_keywords[:3])
        reason = f"Urgency keywords detected: {keyword_str}."
    else:
        reason = "General vocabulary detected with neutral context."
        
    if is_past_event:
        reason += " [ALERT] Time-sensitive OD escalation: Event date has already passed."

    if sentiment_label == "NEGATIVE":
        reason += " Sentiment is negative, indicating high frustration."
    elif sentiment_label == "POSITIVE":
        reason += " Sentiment is positive/constructive."
        
    return {
        "priority": priority,
        "score": round(final_score, 2),
        "sentiment": sentiment_label,
        "reason": reason,
        "isFoodSafetyOverride": food_safety_override
    }

