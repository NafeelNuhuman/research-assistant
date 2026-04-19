@echo off
start "Backend" cmd /k "cd Backend && venv\Scripts\activate && python main.py"
start "Frontend" cmd /k "cd Frontend && npm start"
