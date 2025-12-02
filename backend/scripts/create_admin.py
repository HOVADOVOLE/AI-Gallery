"""
Script: create_admin.py
Description: 
    A CLI utility to create the initial Admin user in the database.
    Since registration is disabled on the public web, this script is 
    the only way to seed the database with the first account.

Usage:
    Run from the 'backend' directory:
    python -m scripts.create_admin
"""

import sys
import os

# Ensure the parent directory is in sys.path so we can import 'database' and 'auth'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from database import engine, User, create_db_and_tables
from auth import get_password_hash

def create_admin():
    """
    Function: create_admin
    
    Description:
        Interactively prompts for email and password, then creates a new Admin user.
        Checks if the user already exists to prevent duplicates.
    """
    print("--- Create Admin User ---")
    
    # Ensure DB exists
    create_db_and_tables()
    
    email = input("Enter Email: ").strip()
    if not email:
        print("Error: Email cannot be empty.")
        return

    password = input("Enter Password: ").strip()
    if not password:
        print("Error: Password cannot be empty.")
        return
    
    with Session(engine) as session:
        # Check existing
        statement = select(User).where(User.email == email)
        existing_user = session.exec(statement).first()
        
        if existing_user:
            print(f"Error: User with email '{email}' already exists.")
            return
            
        # Create new user
        hashed_pw = get_password_hash(password)
        admin_user = User(
            email=email,
            hashed_password=hashed_pw,
            full_name="System Admin",
            role="admin",
            is_active=True
        )
        
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        
        print(f"Success! Admin user '{admin_user.email}' created with ID: {admin_user.id}")

if __name__ == "__main__":
    create_admin()
