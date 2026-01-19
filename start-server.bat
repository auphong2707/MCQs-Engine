@echo off
echo Starting MCQ Review Application Server...
echo.
echo Installing Flask if needed...
pip install flask > nul 2>&1
echo.
echo Server will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.
python server.py
