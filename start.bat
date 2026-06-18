@echo off
REM Launch the Owesome Suite landing page on http://localhost:8000
cd /d "%~dp0"
echo Starting landing page at http://localhost:8000/ ...
start "" http://localhost:8000/
node serve.js
