from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google.generativeai import GenerativeModel
import google.generativeai as genai
import os
import uuid
from database import db, User, Activity
from datetime import date, timedelta

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
        user_message = data.get("message", "")
        response = model.generate_content(user_message)
        return jsonify({"reply": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

if __name__ == "__main__":
    app.run(debug=True)