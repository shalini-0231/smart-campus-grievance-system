from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from priority_engine import analyze_complaint

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
        analysis = analyze_complaint(text)
        return jsonify(analysis)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"SCGRS AI Service running on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=True)
