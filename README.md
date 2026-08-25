# Smart Campus Grievance Redressal System (SCGRS)

SCGRS is an AI-assisted campus grievance management platform designed for students to voice issues and administration to review, route, and resolve them. The system incorporates a rule-based AI Priority Detection and Sentiment Analysis engine written in Python, a robust Node.js/Express API connected to MongoDB, and a modern, responsive React.js frontend using custom premium CSS styling.

---

## 1. Project Folder Structure

```
scgrs/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Student registration, login, and account seeding
│   │   └── complaintController.js  # Complaint CRUD, AI triggers, routing, and metrics
│   ├── middleware/
│   │   └── auth.js                 # JWT verification and student/admin RBAC checks
│   ├── models/
│   │   ├── User.js                 # User mongoose schema (student/admin roles)
│   │   ├── Complaint.js            # Grievance schema with AI metadata fields
│   │   └── Feedback.js             # Resolution rating and comments schema
│   ├── routes/
│   │   ├── authRoutes.js           # Auth route declarations
│   │   └── complaintRoutes.js      # Grievance processing endpoints
│   ├── .env                        # Port, Mongo URI, JWT secret, and AI Service URL
│   ├── package.json                # Express & mongoose configuration
│   └── server.js                   # Entry point, database connectors, and seeding triggers
│
├── frontend/
│   ├── public/                     # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx          # Context-aware navigation bar
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Handles user sessions & local storage authentication
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx     # Core marketing hero explaining features
│   │   │   ├── Login.jsx           # Sign in page with click-to-fill demo accounts
│   │   │   ├── Register.jsx        # Registration form for new students
│   │   │   ├── StudentDashboard.jsx# Metrics and list table of submitted complaints
│   │   │   ├── SubmitComplaint.jsx # Grievance submission form + Live AI Assessment card
│   │   │   ├── MyComplaints.jsx    # Filterable list of student complaints
│   │   │   ├── AdminDashboard.jsx  # Global statistics + department loads + filter logs
│   │   │   └── ComplaintDetails.jsx# Detailed audit trail, status remarks, rating & reopen
│   │   ├── services/
│   │   │   └── api.js              # REST endpoints fetch client wrapper
│   │   ├── App.css                 # Overridden placeholder css
│   │   ├── index.css               # Global theme variables, grid layout, and badging styling
│   │   ├── App.jsx                 # Routes declarations and security path routing
│   │   └── main.jsx                # DOM mounting root
│   ├── index.html                  # HTML template document
│   ├── package.json                # Vite React dependencies configuration
│   └── vite.config.js              # Vite compiler configuration
│
└── ai-service/
    ├── app.py                      # Flask server mapping and POST analytics controller
    ├── priority_engine.py          # Preprocessor, keyword urgency, and sentiment scorers
    ├── requirements.txt            # Flask & CORS packages lists
    └── venv/                       # Isolated Python environment folder
```

---

## 2. Prerequisites & Database Setup

1. **MongoDB**: Ensure MongoDB Server is installed and running on your local machine.
   - Default URI used: `mongodb://127.0.0.1:27017/scgrs`
   - If you want to use MongoDB Atlas, specify your string in `backend/.env` as:
     `MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/scgrs`
2. **Node.js**: Install Node.js (v18+ recommended).
3. **Python**: Install Python (v3.9 - v3.13).

---

## 3. Installation & Run Commands

Execute these commands in three separate terminals inside the root folder:

### Terminal 1: Python AI Service
```bash
cd ai-service
# Create virtual environment (already done)
# python -m venv venv

# Activate Virtual Environment:
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Windows CMD:
.\venv\Scripts\activate.bat
# On Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Start the service (runs on http://127.0.0.1:5000)
python app.py
```

### Terminal 2: Node.js Backend Server
```bash
cd backend
# Install dependencies
npm install

# Start the server (runs on http://127.0.0.1:5001)
npm start
```
*Note: On startup, the backend automatically seeds the MongoDB database with demo accounts and five test grievances.*

### Terminal 3: Vite React Frontend
```bash
cd frontend
# Install dependencies
npm install

# Run development server (runs on http://localhost:5173/)
npm run dev
```

---

## 4. Demo Login Credentials

For convenience, the login page contains quick-action buttons to fill and submit these credentials in one click.

* **Student Account**:
  - **Email**: `student@scgrs.com`
  - **Password**: `password123`
* **Admin Account**:
  - **Email**: `admin@scgrs.com`
  - **Password**: `password123`

---

## 5. REST API Documentation

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Public | Student registers credentials, returns JWT token. |
| **POST** | `/api/auth/login` | Public | Login credentials, returns JWT and user metadata. |
| **GET** | `/api/auth/me` | Logged In | Retrieves current active user profile information. |
| **POST** | `/api/complaints` | Student | Submit grievance. Triggers AI analysis & assigns department. |
| **GET** | `/api/complaints` | Logged In | Retrieve complaints. Student sees own; Admin sees all filterable logs. |
| **GET** | `/api/complaints/:id` | Logged In | Get specific complaint details + associated feedback. |
| **PUT** | `/api/complaints/:id/status` | Admin | Change workflow state & submit adminremarks. |
| **PUT** | `/api/complaints/:id/department` | Admin | Manually re-route grievance to a different department. |
| **POST** | `/api/complaints/:id/feedback` | Student | Submit 1-5 rating & comments for resolved issues. |
| **POST** | `/api/complaints/:id/reopen` | Student | Reopen a resolved issue, transitioning state to `REOPENED`. |
| **POST** | `/api/complaints/ai/analyze` | Logged In | Proxy endpoint forwarding text directly to the Python AI service. |
| **GET** | `/api/admin/statistics` | Admin | Retrieves global count metrics & department loads breakdown. |
| **GET** | `/api/complaints/student/stats`| Student | Retrieves student's personal counts (total, pending, resolved). |

---

## 6. Implementation Summary

### What is Implemented (Phase 1 - MVP)
1. **Interactive UI**: Custom design with sleek dark gradients, responsive grid layouts, glassmorphism cards, and structured metrics counters.
2. **Demo Quick Logins**: Enables one-click filling and automatic logging for immediate college review.
3. **AI Urgency Detector**: Python engine scanning for category keywords to map LOW, MEDIUM, HIGH, and CRITICAL severities.
4. **AI Sentiment Scorer**: Sentiment word matching to modify urgency priority (negative sentiment adds +10% urgency score weight).
5. **Automatic Routing Rules**: Maps complaints directly to campus departments (IT, Maintenance, Hostel, Welfare) depending on category.
6. **Live AI Assessment Card**: Side-by-side preview on the submit page showing AI estimations as you type.
7. **Identity Protection**: Anonymous complaints block submitter details (name/email) on all admin panels.
8. **Admin Operations**: Remarks input, status toggle, manual routing overrides, and department loading cards.
9. **Student Feedback Loop**: Five-star rating surveys and single-click reopen capabilities.
10. **Resilience Fallback**: Express server runs local JS keyword matching if the Flask AI server is offline.

### Upcoming Features (Phase 2)
- **Advanced NLP Classifiers**: Moving from rule-based lookup to a trained Random Forest or LightGBM model.
- **Duplicate Detection**: Scanning database for matching issues using sentence embeddings to avoid double filing.
- **SLA Escalation Timer**: Color indicator timers countdown for resolution target, escalating to higher officials if breached.
- **Notifications Engine**: Automated Email/SMS alerts triggered when status changes.
- **Visual Analytics**: Interactive bar charts for monthly trends and resolution rates.
