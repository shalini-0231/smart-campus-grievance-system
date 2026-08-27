import re

def detect_category_from_text(text):
    if not text:
        return 'Other'
    clean = text.lower()
    
    if any(k in clean for k in ['canteen', 'mess', 'food', 'dish', 'biryani', 'tea', 'hygiene', 'foreign object', 'cockroach', 'meal', 'taste']):
        return 'Canteen Dish Issue'
    elif any(k in clean for k in ['od form', 'on duty', 'mentor sign', 'counsellor', 'hod sign', 'attendance not updated', 'event approval', 'symposium']):
        return 'OD Form Issue'
    elif any(k in clean for k in ['wifi', 'wi-fi', 'internet', 'speed', 'network', 'connectivity', 'router']):
        return 'Internet/Wi-Fi'
    elif any(k in clean for k in ['bus', 'transport', 'driver', 'route', 'pickup']):
        return 'Transport'
    elif any(k in clean for k in ['hostel', 'room', 'bed', 'bathroom', 'cleaning', 'washroom']):
        return 'Hostel'
    elif any(k in clean for k in ['fan', 'light', 'door', 'window', 'leak', 'water', 'bench', 'chair', 'projector']):
        return 'Infrastructure'
    elif any(k in clean for k in ['exam', 'mark', 'grade', 'result', 'faculty', 'attendance', 'syllabus', 'hall ticket']):
        return 'Academic'
    elif any(k in clean for k in ['harass', 'ragging', 'abuse', 'threat', 'bully', 'safety']):
        return 'Harassment'
    else:
        return 'Other'

def get_guided_question(text, category=None, step=1):
    detected_cat = category if category else detect_category_from_text(text)
    
    if step == 1:
        if detected_cat == 'Canteen Dish Issue':
            return {
                "category": detected_cat,
                "prompt": "I noticed this is related to food/canteen. Which canteen or mess location did this occur in?",
                "fieldTarget": "canteenLocation",
                "quickReplies": ["Block A Canteen", "Hostel Boys Mess", "Hostel Girls Mess", "Central Food Court", "Library Cafe"]
            }
        elif detected_cat == 'OD Form Issue':
            return {
                "category": detected_cat,
                "prompt": "Got it, this is an On-Duty (OD) form problem. What is the event name and event date?",
                "fieldTarget": "eventName",
                "quickReplies": ["National Technical Symposium", "Inter-College Sports Meet", "Hackathon / Workshop"]
            }
        elif detected_cat == 'Internet/Wi-Fi':
            return {
                "category": detected_cat,
                "prompt": "Understood, Wi-Fi or network issue. Which building or room is affected?",
                "fieldTarget": "location",
                "quickReplies": ["Central Library", "Academic Block 1", "Hostel Block A", "Main Auditorium"]
            }
        elif detected_cat == 'Hostel':
            return {
                "category": detected_cat,
                "prompt": "Hostel grievance noted. What is your Hostel Block and Room Number?",
                "fieldTarget": "location",
                "quickReplies": ["Hostel Block A, Room 204", "Hostel Block B, Room 102", "Girls Hostel Block C"]
            }
        elif detected_cat == 'Infrastructure':
            return {
                "category": detected_cat,
                "prompt": "Infrastructure maintenance issue detected. Which classroom or facility needs repair?",
                "fieldTarget": "location",
                "quickReplies": ["Academic Block 1 - Room 105", "Computer Lab 3", "Main Auditorium"]
            }
        else:
            return {
                "category": detected_cat,
                "prompt": "Thank you for sharing. Could you specify the exact location or department on campus where this occurred?",
                "fieldTarget": "location",
                "quickReplies": ["Academic Block 1", "Main Campus Premises", "Library", "Administrative Block"]
            }

    elif step == 2:
        if detected_cat == 'Canteen Dish Issue':
            return {
                "category": detected_cat,
                "prompt": "What was the dish name and primary issue type?",
                "fieldTarget": "dishName",
                "quickReplies": ["Chicken Biryani", "Special Thali", "Meals", "Tea / Snacks"]
            }
        elif detected_cat == 'OD Form Issue':
            return {
                "category": detected_cat,
                "prompt": "Where is your OD signature approval currently pending or stuck?",
                "fieldTarget": "pendingApprovalFrom",
                "quickReplies": ["1. Mentor Sign", "2. Class Counsellor", "3. HOD Approval", "4. Academic Cell"]
            }
        else:
            return {
                "category": detected_cat,
                "prompt": "Would you like to submit this grievance anonymously to protect your identity?",
                "fieldTarget": "anonymous",
                "quickReplies": ["Yes, keep me anonymous 🔒", "No, include my name 👤"]
            }

    elif step == 3:
        return {
            "category": detected_cat,
            "prompt": "Would you like to submit this grievance anonymously to protect your identity?",
            "fieldTarget": "anonymous",
            "quickReplies": ["Yes, keep me anonymous 🔒", "No, include my name 👤"]
        }
    
    else:
        return {
            "category": detected_cat,
            "prompt": "Everything is captured! Please review your grievance summary card below before submitting.",
            "fieldTarget": "confirm",
            "quickReplies": ["🚀 Confirm & Submit Grievance", "✏️ Edit Answer"]
        }
