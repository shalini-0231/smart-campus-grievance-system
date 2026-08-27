from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from priority_engine import analyze_complaint
from question_engine import get_guided_question, detect_category_from_text
from campus_knowledge import query_campus_ai

app = Flask(__name__)
# Enable CORS for cross-origin requests
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "scgrs-ai-service"})

@app.route('/api/ai/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' parameter in request body"}), 400
        
        text = data['text']
        event_date = data.get('eventDate')
        issue_type = data.get('issueType')
        analysis = analyze_complaint(text, event_date_str=event_date, issue_type=issue_type)
        return jsonify(analysis)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/next-question', methods=['POST'])
def next_question():
    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        category = data.get('category')
        step = int(data.get('step', 1))
        
        question_data = get_guided_question(text, category=category, step=step)
        return jsonify(question_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json() or {}
        message = data.get('message', '')
        role = data.get('role', 'student')
        context = data.get('context')
        
        response = query_campus_ai(message, role=role, user_context=context)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"SCGRS AI Service running on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=True)
