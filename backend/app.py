from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google.generativeai import GenerativeModel
import google.generativeai as genai
import os
import uuid
from database import db, User

# ==== Load environment variables ====
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# ==== Configure Gemini ====
genai.configure(api_key=GOOGLE_API_KEY)
model = GenerativeModel("gemini-1.5-flash")

# ==== Flask App Setup ====
app = Flask(__name__)
CORS(app)

# ==== Database Setup ====
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    # Optional: Add a default user only if needed
    if not User.query.filter_by(user_id="default_user").first():
        dummy_user = User(
            user_id="default_user",
            name="John Doe",
            email="john@example.com",
            username="john",
            password="password"
        )
        db.session.add(dummy_user)
        db.session.commit()

# ==== Chat Route ====
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "")

        response = model.generate_content(user_message)
        model_message = response.text

        return jsonify({"reply": model_message})
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": "Internal Server Error"}), 500

# ==== Login Route ====
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        user = User.query.filter_by(username=username, password=password).first()

        if user:
            return jsonify({
                "message": "Login successful",
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email
            })
        else:
            return jsonify({"error": "Invalid username or password"}), 401

    except Exception as e:
        print("Login error:", e)
        return jsonify({"error": "Server error"}), 500

# ==== Signup Route ====
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        username = data.get("username")
        password = data.get("password")

        # Check if username exists
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 409

        # Create a unique user_id
        user_id = str(uuid.uuid4())

        new_user = User(
            user_id=user_id,
            name=name,
            email=email,
            username=username,
            password=password
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "message": "User created successfully",
            "user_id": user_id,
            "name": name,
            "email": email
        }), 201

    except Exception as e:
        print("Signup error:", e)
        return jsonify({"error": "Server error"}), 500

# ==== Get Profile by Query Param ====
@app.route("/profile", methods=["GET"])
def get_profile_by_query():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400

    user = User.query.filter_by(user_id=user_id).first()
    if user:
        return jsonify({
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "username": user.username
        })
    else:
        return jsonify({"error": "User not found"}), 404

# ==== Get Profile by Internal ID ====
@app.route("/profile/<int:user_id>", methods=["GET"])
def get_profile_by_id(user_id):
    user = User.query.get(user_id)
    if user:
        return jsonify({
            "id": user.id,
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "username": user.username
        })
    else:
        return jsonify({"error": "User not found"}), 404

# ==== Run App ====
if __name__ == "__main__":
    app.run(debug=True)
