import re
import csv
import os

# ── Load keywords from CSV (single source of truth: ai-service/keyword_severity.csv) ─
KEYWORD_SEVERITY = []
try:
    csv_path = os.path.join(os.path.dirname(__file__), 'keyword_severity.csv')
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                KEYWORD_SEVERITY.append({
                    'word':       row['keyword'].strip().lower(),
                    'category':   row['category'].strip(),
                    'department': row['department'].strip(),
                    'weight':     int(row['severity_weight']),
                })
            except (KeyError, ValueError):
                pass  # skip malformed rows silently
except Exception as e:
    print(f'Warning: Failed to load keyword_severity.csv — {e}')

# Pre-compute Smax per category (Eq. 4 denominator).
# Smax_category = sum of ALL keyword weights in that category.
CATEGORY_SMAX: dict = {}
for _item in KEYWORD_SEVERITY:
    cat = _item['category']
    CATEGORY_SMAX[cat] = CATEGORY_SMAX.get(cat, 0) + _item['weight']

# Food-Safety group (D-1 Option A): Canteen Dish Issue keywords with weight >= 25.
# Lower-weight canteen keywords (canteen, mess, dish at weight 15) are NOT in this group.
FOOD_SAFETY_GROUP: set = {
    item['word']
    for item in KEYWORD_SEVERITY
    if item['category'] == 'Canteen Dish Issue' and item['weight'] >= 25
}

# Sentiment word sets (annotation only — D-3 Option A; do NOT affect score).
NEGATIVE_WORDS: set = {
    'not', 'bad', 'worst', 'broken', 'terrible', 'unsafe', 'scared', 'afraid',
    'harassed', 'fail', 'delay', 'poor', 'unhappy', 'angry', 'frustrated',
    'disappointed', 'slow', 'failed', 'error', 'issue', 'problem', 'hate',
    'no', 'harassment', 'ragging', 'violence', 'abuse', 'threat', 'emergency',
    'rejected', 'unapproved', 'pending', 'missing',
}
POSITIVE_WORDS: set = {
    'good', 'great', 'excellent', 'happy', 'satisfied', 'solved', 'fixed',
    'nice', 'helpful', 'thanks', 'thank', 'love', 'awesome', 'perfect',
    'resolved', 'approved',
}


def levenshtein(a: str, b: str) -> int:
    """Compute Levenshtein edit distance (pure Python, no external library)."""
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            prev, dp[j] = dp[j], (prev if a[i - 1] == b[j - 1]
                                   else 1 + min(prev, dp[j], dp[j - 1]))
    return dp[n]


def preprocess_text(text: str) -> str:
    """Lowercase and strip punctuation (retains alphanumeric + spaces)."""
    if not text:
        return ''
    return re.sub(r'[^\w\s]', '', text.lower())


def analyze_sentiment(text: str) -> str:
    """
    Sentiment annotation — NOT used in scoring (D-3 Option A).
    Returns 'POSITIVE', 'NEGATIVE', or 'NEUTRAL'.
    """
    words = preprocess_text(text).split()
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    total = neg + pos
    if total == 0:
        return 'NEUTRAL'
    ratio = (pos - neg) / total
    if ratio > 0.15:
        return 'POSITIVE'
    if ratio < -0.15:
        return 'NEGATIVE'
    return 'NEUTRAL'


def analyze_complaint(text: str,
                      event_date_str: str = None,
                      issue_type: str = None) -> dict:
    """
    Deterministic priority engine per Section III-B, Equations (1)–(4).

    Eq. (1)  S(T) = Σ w_i  for all matched keywords (exact THEN fuzzy)
    Eq. (2)  Fuzzy: Levenshtein(token, keyword) ≤ 2, single-token keywords ≥ 4 chars
    Eq. (3)  CRITICAL ≥ 80  |  HIGH ≥ 60  |  MEDIUM ≥ 40  |  LOW < 40
    Eq. (4)  C(T) = min(100, S(T) / Smax_category × 100)

    Food-safety override (D-1-A): any Food Safety group keyword matched → CRITICAL.
    Sentiment (D-3-A): annotation field only; removed from score path.
    Unmatched fallback (D-2-B): confidencePercent = 5 (UI floor).
    """
    clean_text = preprocess_text(text)
    tokens = clean_text.split() if clean_text else []

    # ── Step 1: Exact keyword matching (word-boundary regex) ──────────────────
    # matched: clean_kw → {original, weight, category, department, match_type}
    matched: dict = {}
    for item in KEYWORD_SEVERITY:
        clean_kw = preprocess_text(item['word'])
        if not clean_kw:
            continue
        if re.search(r'\b' + re.escape(clean_kw) + r'\b', clean_text):
            if clean_kw not in matched:
                matched[clean_kw] = {
                    'original':   item['word'],
                    'weight':     item['weight'],
                    'category':   item['category'],
                    'department': item['department'],
                    'match_type': 'exact',
                }

    # ── Step 2: Eq. (2) — Fuzzy matching (single tokens, Levenshtein ≤ 2) ────
    # Collect all individual tokens already covered by exact matches.
    exact_tokens: set = set()
    for kw_str in matched:
        for tok in kw_str.split():
            exact_tokens.add(tok)

    for token in tokens:
        if len(token) < 3 or token in exact_tokens:
            continue
        best_item, best_dist = None, 3   # distance must be strictly < 3
        for item in KEYWORD_SEVERITY:
            clean_kw = preprocess_text(item['word'])
            # Only single-token keywords of length >= 4 are eligible for fuzzy (D-5)
            if not clean_kw or ' ' in clean_kw or len(clean_kw) < 4:
                continue
            dist = levenshtein(token, clean_kw)
            if dist <= 2 and dist < best_dist:
                best_dist, best_item = dist, item
        if best_item:
            clean_kw = preprocess_text(best_item['word'])
            if clean_kw not in matched:
                matched[clean_kw] = {
                    'original':    best_item['word'],
                    'weight':      best_item['weight'],
                    'category':    best_item['category'],
                    'department':  best_item['department'],
                    'match_type':  'fuzzy',
                    'fuzzy_token': token,
                }
            exact_tokens.add(token)

    # ── Step 3: Eq. (1) — Weighted sum ───────────────────────────────────────
    total_score: int = sum(m['weight'] for m in matched.values())

    # ── Explainability: return keyword strings with weight contributions ───────
    matched_keywords: list = []
    for m in matched.values():
        if m['match_type'] == 'fuzzy':
            matched_keywords.append(
                f"~{m['fuzzy_token']} \u2192 {m['original']} (+{m['weight']})"
            )
        else:
            matched_keywords.append(f"{m['original']} (+{m['weight']})")

    # ── Dominant category (highest-weight match — used for Eq. 4) ─────────────
    dominant = max(matched.values(), key=lambda m: m['weight']) if matched else None
    dominant_category:   str = dominant['category']   if dominant else None
    dominant_department: str = dominant['department']  if dominant else None

    # ── Food-Safety Override (D-1 Option A: single CRITICAL tier) ────────────
    # Fires when any Food Safety group keyword is matched in the text,
    # OR when issueType signals a Canteen Dish Issue submission.
    food_safety_override: bool = any(
        m['original'] in FOOD_SAFETY_GROUP for m in matched.values()
    )
    if issue_type in ('FOREIGN_OBJECT', 'HYGIENE') and not food_safety_override:
        food_safety_override = True
    if food_safety_override:
        dominant_category   = dominant_category   or 'Canteen Dish Issue'
        dominant_department = dominant_department or 'Canteen & Hospitality'

    # ── Step 4: Eq. (3) — Priority from integer score ────────────────────────
    if food_safety_override:
        priority = 'CRITICAL'
    elif total_score >= 80:
        priority = 'CRITICAL'
    elif total_score >= 60:
        priority = 'HIGH'
    elif total_score >= 40:
        priority = 'MEDIUM'
    else:
        priority = 'LOW'

    # ── Step 5: Eq. (4) — Category-specific confidence ───────────────────────
    if total_score > 0 and dominant_category:
        smax = CATEGORY_SMAX.get(dominant_category, 100)
        confidence_pct = min(100, max(5, round((total_score / smax) * 100)))
    else:
        confidence_pct = 5   # D-2 Option B: UI floor for zero-match

    # Normalize score to 0–1 for API contract (score field)
    score = round(min(1.0, total_score / 100.0), 2) if total_score > 0 else 0.05

    # ── Sentiment annotation (D-3: not in scoring) ────────────────────────────
    sentiment_label: str = analyze_sentiment(text)

    # ── Reason string ─────────────────────────────────────────────────────────
    if food_safety_override:
        reason = (
            '[ALERT] Food Safety Override: Complaint involves a Food Safety keyword '
            'in Canteen Dish Issue category — auto-escalated to CRITICAL.'
        )
    elif matched_keywords:
        reason = f"Urgency keywords detected: {', '.join(matched_keywords[:3])}."
    else:
        reason = 'No urgency keywords matched. General complaint — LOW priority assigned.'

    return {
        'priority':          priority,
        'score':             score,
        'confidencePercent': confidence_pct,
        'matchedKeywords':   matched_keywords,
        'sentiment':         sentiment_label,
        'reason':            f'{confidence_pct}% \u2014 {priority} \u2014 {reason}',
        'isFoodSafetyOverride': food_safety_override,
        'detectedCategory':  dominant_category,
        'assignedDepartment': dominant_department,
    }
