import sqlite3

db_path = "backend/database.db"

commands = [
    "ALTER TABLE image ADD COLUMN is_deleted BOOLEAN DEFAULT 0;",
    "ALTER TABLE album ADD COLUMN is_deleted BOOLEAN DEFAULT 0;"
]

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    for cmd in commands:
        try:
            print(f"Executing: {cmd}")
            cursor.execute(cmd)
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column already exists, skipping.")
            else:
                print(f"Error: {e}")

    conn.commit()
    conn.close()
    print("Migration successful.")
except Exception as e:
    print(f"Migration failed: {e}")
