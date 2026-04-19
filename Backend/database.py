import sqlite3
import datetime
import config as app_config

connection = sqlite3.connect(app_config.SQLITE_DB_PATH)
connection.execute("PRAGMA foreign_keys = ON")

def init_db():
    sessions_table = """
        CREATE TABLE IF NOT EXISTS SESSIONS (
            session_id TEXT PRIMARY KEY,
            created_at TEXT
        );
        """
    messages_table = """
        CREATE TABLE IF NOT EXISTS MESSAGES (
            message_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            position INTEGER,
            FOREIGN KEY (session_id)
                REFERENCES sessions (session_id)
                ON DELETE CASCADE 
                ON UPDATE NO ACTION
        );
        """
    cursor = connection.cursor()
    cursor.executescript(sessions_table + messages_table)


def create_session(session_id: str) -> None:
    cursor = connection.cursor()
    cursor.execute(
        "INSERT INTO SESSIONS (session_id, created_at) VALUES (?, ?)",
        (session_id, datetime.datetime.now().isoformat())
    )
    connection.commit()


def save_message(session_id: str, role: str, content: str, position: int) -> None:
    cursor = connection.cursor()
    cursor.execute(
        "INSERT INTO MESSAGES (session_id, role, content, position) VALUES (?, ?, ?, ?)",
        (session_id, role, content, position)
    )
    connection.commit()


def get_messages(session_id: str) -> list:
    cursor = connection.cursor()
    cursor.execute(
        "SELECT role, content FROM MESSAGES WHERE session_id = ? ORDER BY position",
        (session_id,)
    )
    return [{"role": row[0], "content": row[1]} for row in cursor.fetchall()]


def get_max_position(session_id: str) -> int:
    cursor = connection.cursor()
    cursor.execute(
        "SELECT COALESCE(MAX(position), -1) FROM MESSAGES WHERE session_id = ?",
        (session_id,)
    )
    return cursor.fetchone()[0]


def get_sessions() -> list:
    cursor = connection.cursor()
    cursor.execute(
        "SELECT session_id, created_at FROM SESSIONS ORDER BY created_at DESC"
    )
    return [{"session_id": row[0], "created_at": row[1]} for row in cursor.fetchall()]


def delete_session(session_id: str) -> None:
    cursor = connection.cursor()
    cursor.execute("DELETE FROM SESSIONS WHERE session_id = ?", (session_id,))
    connection.commit()
