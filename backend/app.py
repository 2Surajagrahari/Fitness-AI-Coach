from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google.generativeai import GenerativeModel
import google.generativeai as genai
import os
import uuid
from database import db, User, Activity
from datetime import date, timedelta, datetime


load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)
model = GenerativeModel("gemini-1.5-flash")

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        username = data.get("username", "User")
        
        if not user_message:
            return jsonify({"error": "Message cannot be empty"}), 400

        prompt = f"""You are FitnessAI, a professional fitness coach assistant. The user '{username}' asked:
"{user_message}"

Respond with these formatting rules:
1. Use ONLY these HTML tags: <p>, <strong>, <em>, <ul>, <li>
2. Never use <br> tags
3. Each paragraph should be wrapped in <p> tags
4. Use 1-2 relevant emojis
5. Keep lists properly formatted with <ul> and <li>
6. Don't include any closing </p> tags (we'll handle that)
7. Never put <p> tags inside other <p> tags"""

        response = model.generate_content(prompt)
        
        # Clean up the response formatting
        formatted_response = (
            response.text
            .replace('</p>', '')  # Remove all closing p tags
            .replace('<p>', '</p><p>')  # Convert opening p tags to closing+opening
            .replace('</p><p>', '', 1)  # Remove the first replacement
            .replace('\n\n', '</p><p>')  # Double newlines become paragraphs
            .replace('\n', ' ')  # Single newlines become spaces
            .replace('<br>', ' ')  # Remove any br tags
            .replace('<br/>', ' ')  # Remove any br tags
            .replace('  ', ' ')  # Remove double spaces
        )
        
        # Ensure proper HTML structure
        if not formatted_response.startswith('<p>'):
            formatted_response = f'<p>{formatted_response}'
        if not formatted_response.endswith('</p>'):
            formatted_response = f'{formatted_response}</p>'
            
        return jsonify({
            "reply": formatted_response,
            "username": username,
            "timestamp": datetime.now().isoformat(),
            "type": "fitness_response"
        })
        
    except Exception as e:
        error_msg = f"<p>Sorry, I encountered an error: {str(e)}</p>"
        return jsonify({"reply": error_msg, "error": str(e)}), 500
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if not user or user.password != password:
        return jsonify({"error": "Invalid username or password"}), 401

    return jsonify({
        "message": "Login successful",
        "user_id": user.user_id,
        "username": user.username
    })

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    name = data.get("name", "")
    email = data.get("email", "")

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    user_id = str(uuid.uuid4())
    new_user = User(
        user_id=user_id,
        username=username,
        password=password,
        name=name,
        email=email
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "User created successfully",
        "user_id": user_id,
        "username": username
    })

@app.route("/profile/<user_id>", methods=["GET"])
def get_profile(user_id):
    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "username": user.username
    })

@app.route("/dashboard-data/<user_id>", methods=["GET"])
def get_dashboard_data(user_id):
    try:
        #get last 7 days of activity
        records = Activity.query.filter_by(user_id=user_id)\
                      .order_by(Activity.date.desc())\
                      .limit(7)\
                      .all()
        
        #calculate streak
        streak = 0
        today = str(date.today())
        for record in records:
            if record.date == today and record.steps >= 10000:  # 10k step goal
                streak += 1
            elif record.steps >= 10000:
                streak += 1
            else:
                break
        
        return jsonify({
            "streak": streak,
            "activity": [{
                "date": r.date,
                "steps": r.steps,
                "calories": r.calories
            } for r in records]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/save-activity", methods=["POST"])
def save_activity():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        steps = data.get("steps", 0)
        calories = data.get("calories", 0)
        date_str = data.get("date", str(date.today()))
        
        activity = Activity.query.filter_by(user_id=user_id, date=date_str).first()
        
        if activity:
            activity.steps = steps
            activity.calories = calories
        else:
            activity = Activity(
                user_id=user_id,
                date=date_str,
                steps=steps,
                calories=calories
            )
            db.session.add(activity)
        
        db.session.commit()
        return jsonify({"message": "Activity saved successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/set-username", methods=["POST"])
def set_username():
    data = request.get_json()
    username = data.get("username", "User")
    
    # In a real app, you'd save this to the database
    return jsonify({
        "status": "success",
        "username": username
    })


if __name__ == "__main__":
    app.run(debug=True)