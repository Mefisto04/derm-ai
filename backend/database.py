from pymongo import MongoClient
from config import Config
import logging
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        try:
            self.client = MongoClient(Config.MONGODB_URI)
            self.db = self.client[Config.DB_NAME]
            # Create indexes for better query performance
            self.db[Config.IMAGES_COLLECTION].create_index([("timestamp", -1)])
            self.db[Config.PREDICTIONS_COLLECTION].create_index([("image_id", 1)])
            self.db[Config.USERS_COLLECTION].create_index([("email", 1)], unique=True)
            logger.info("MongoDB connection established successfully")
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {str(e)}")
            raise

    def store_image(self, image_data):
        """Store image and its metadata"""
        try:
            result = self.db[Config.IMAGES_COLLECTION].insert_one(image_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error storing image: {str(e)}")
            raise

    # def store_prediction(self, prediction_data):
    #     """Store prediction results"""
    #     try:
    #         result = self.db[Config.PREDICTIONS_COLLECTION].insert_one(prediction_data)
    #         return str(result.inserted_id)
    #     except Exception as e:
    #         logger.error(f"Error storing prediction: {str(e)}")
    #         raise
    
    # database.py

    # Update store_prediction to handle multiple predictions
    def store_prediction(self, prediction_data):
        """Store prediction results"""
        try:
            # Convert numpy types to native Python types
            if 'class_probabilities' in prediction_data:
                prediction_data['class_probabilities'] = [
                    float(x) for x in prediction_data['class_probabilities']
                ]
            
            result = self.db[Config.PREDICTIONS_COLLECTION].insert_one(prediction_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error storing prediction: {str(e)}")
            raise

    def get_image_history(self, limit=10):
        """Get recent image predictions"""
        try:
            pipeline = [
                {"$sort": {"timestamp": -1}},
                {"$limit": limit},
                {
                    "$lookup": {
                        "from": Config.PREDICTIONS_COLLECTION,
                        "localField": "_id",
                        "foreignField": "image_id",
                        "as": "prediction_details"
                    }
                },
                {
                    "$project": {
                        "filename": 1,
                        "prediction": 1,
                        "confidence": 1,
                        "timestamp": 1,
                        "top3_predictions": {"$arrayElemAt": ["$prediction_details.top3_predictions", 0]},
                        "_id": 0
                    }
                }
            ]
            return list(self.db[Config.IMAGES_COLLECTION].aggregate(pipeline))
        except Exception as e:
            logger.error(f"Error fetching image history: {str(e)}")
            raise

    # User Authentication Methods
    def register_user(self, email, password, name):
        """Register a new user"""
        try:
            # Check if user already exists
            if self.db[Config.USERS_COLLECTION].find_one({"email": email}):
                return False, "Email already registered"
            
            # Create user document with 'user' role by default
            user = {
                "email": email,
                "password": generate_password_hash(password),
                "name": name,
                "role": "user",  # Default role for all registered users
                "created_at": datetime.utcnow(),
                "last_login": None
            }
            
            result = self.db[Config.USERS_COLLECTION].insert_one(user)
            return True, str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error registering user: {str(e)}")
            return False, str(e)
    
    def login_user(self, email, password):
        """Authenticate a user"""
        try:
            # Hardcoded admin check
            if email == "admin@gmail.com" and password == "admin123":
                # Create admin user if it doesn't exist
                admin_user = self.db[Config.USERS_COLLECTION].find_one({"email": email})
                if not admin_user:
                    admin_user = {
                        "email": email,
                        "password": generate_password_hash(password),
                        "name": "Admin",
                        "role": "admin",
                        "created_at": datetime.utcnow(),
                        "last_login": datetime.utcnow()
                    }
                    self.db[Config.USERS_COLLECTION].insert_one(admin_user)
                
                # Generate session token
                session_token = str(uuid.uuid4())
                
                # Update admin session
                self.db[Config.USERS_COLLECTION].update_one(
                    {"email": email},
                    {
                        "$set": {
                            "last_login": datetime.utcnow(),
                            "session_token": session_token,
                            "token_expires": datetime.utcnow() + timedelta(days=1)
                        }
                    }
                )
                
                return True, {
                    "token": session_token,
                    "user": {
                        "email": "admin@gmail.com",
                        "name": "Admin",
                        "role": "admin"
                    }
                }
            
            # Regular user login
            user = self.db[Config.USERS_COLLECTION].find_one({"email": email})
            
            if not user:
                return False, "Invalid email or password"
            
            # Check password
            if not check_password_hash(user["password"], password):
                return False, "Invalid email or password"
            
            # Generate session token
            session_token = str(uuid.uuid4())
            
            # Update last login and session
            self.db[Config.USERS_COLLECTION].update_one(
                {"email": email},
                {
                    "$set": {
                        "last_login": datetime.utcnow(),
                        "session_token": session_token,
                        "token_expires": datetime.utcnow() + timedelta(days=1)
                    }
                }
            )
            
            return True, {
                "token": session_token,
                "user": {
                    "email": user["email"],
                    "name": user["name"],
                    "role": user.get("role", "user")  # Default to 'user' if role not set
                }
            }
        except Exception as e:
            logger.error(f"Error during login: {str(e)}")
            return False, str(e)
    
    def verify_token(self, token):
        """Verify a user's session token"""
        try:
            user = self.db[Config.USERS_COLLECTION].find_one({
                "session_token": token,
                "token_expires": {"$gt": datetime.utcnow()}
            })
            
            if not user:
                return False, "Invalid or expired token"
            
            return True, {
                "email": user["email"],
                "name": user["name"],
                "role": user.get("role", "user")  # Include role in response
            }
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            return False, str(e)
    
    def close(self):
        """Close MongoDB connection"""
        try:
            self.client.close()
            logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {str(e)}")
            
    # Blog-related methods
    def create_blog_post(self, title, content, author_id, author_name, image_data=None):
        """Create a new blog post"""
        try:
            blog_post = {
                "title": title,
                "content": content,
                "author_id": author_id,
                "author_name": author_name,
                "image_data": image_data,  # Base64 encoded image (optional)
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = self.db[Config.BLOGS_COLLECTION].insert_one(blog_post)
            return True, str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating blog post: {str(e)}")
            return False, str(e)
    
    def get_blog_posts(self, limit=10, skip=0):
        """Get all blog posts with pagination"""
        try:
            posts = list(
                self.db[Config.BLOGS_COLLECTION]
                .find({})
                .sort("created_at", -1)  # Sort by most recent first
                .skip(skip)
                .limit(limit)
            )
            
            # Convert ObjectId to string for JSON serialization
            for post in posts:
                post["_id"] = str(post["_id"])
            
            return posts
        except Exception as e:
            logger.error(f"Error getting blog posts: {str(e)}")
            raise
    
    def get_blog_post(self, post_id):
        """Get a specific blog post by ID"""
        try:
            from bson.objectid import ObjectId
            
            post = self.db[Config.BLOGS_COLLECTION].find_one({"_id": ObjectId(post_id)})
            
            if post:
                post["_id"] = str(post["_id"])
                return post
            return None
        except Exception as e:
            logger.error(f"Error getting blog post: {str(e)}")
            return None
    
    def update_blog_post(self, post_id, title, content, image_data=None):
        """Update an existing blog post"""
        try:
            from bson.objectid import ObjectId
            
            update_data = {
                "title": title,
                "content": content,
                "updated_at": datetime.utcnow()
            }
            
            # Only update image if provided
            if image_data:
                update_data["image_data"] = image_data
                
            result = self.db[Config.BLOGS_COLLECTION].update_one(
                {"_id": ObjectId(post_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating blog post: {str(e)}")
            return False
    
    def delete_blog_post(self, post_id):
        """Delete a blog post"""
        try:
            from bson.objectid import ObjectId
            
            result = self.db[Config.BLOGS_COLLECTION].delete_one({"_id": ObjectId(post_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting blog post: {str(e)}")
            return False 