from flask import Blueprint, request, jsonify
import logging
from database import MongoDB
import re
import json
from flask_cors import cross_origin

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)
db = MongoDB()

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["https://genhub-frontend.vercel.app", "http://localhost:3000", "http://localhost:5173"], 
              methods=["GET", "POST", "OPTIONS"],
              allow_headers=["Content-Type", "Authorization"],
              supports_credentials=True)
def register():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(k in data for k in ['email', 'password', 'name']):
            return jsonify({"success": False, "message": "Missing required fields"}), 400
        
        email = data['email']
        password = data['password']
        name = data['name']
        
        # Basic validation
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"success": False, "message": "Invalid email format"}), 400
        
        if len(password) < 6:
            return jsonify({"success": False, "message": "Password must be at least 6 characters"}), 400
        
        # Register user
        success, result = db.register_user(email, password, name)
        
        if success:
            return jsonify({"success": True, "message": "Registration successful", "user_id": result}), 201
        else:
            return jsonify({"success": False, "message": result}), 400
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"success": False, "message": "Server error"}), 500

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["https://genhub-frontend.vercel.app", "http://localhost:3000", "http://localhost:5173"], 
              methods=["GET", "POST", "OPTIONS"],
              allow_headers=["Content-Type", "Authorization"],
              supports_credentials=True)
def login():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(k in data for k in ['email', 'password']):
            return jsonify({"success": False, "message": "Missing email or password"}), 400
        
        email = data['email']
        password = data['password']
        
        # Authenticate user
        success, result = db.login_user(email, password)
        
        if success:
            return jsonify({
                "success": True, 
                "message": "Login successful",
                "token": result["token"],
                "user": result["user"]
            }), 200
        else:
            return jsonify({"success": False, "message": result}), 401
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"success": False, "message": "Server error"}), 500

@auth_bp.route('/verify-token', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["https://genhub-frontend.vercel.app", "http://localhost:3000", "http://localhost:5173"], 
              methods=["GET", "POST", "OPTIONS"],
              allow_headers=["Content-Type", "Authorization"],
              supports_credentials=True)
def verify_token():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({"success": False, "message": "Token not provided"}), 400
        
        token = data['token']
        
        # Verify token
        success, result = db.verify_token(token)
        
        if success:
            return jsonify({
                "success": True,
                "user": result
            }), 200
        else:
            return jsonify({"success": False, "message": result}), 401
        
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({"success": False, "message": "Server error"}), 500 