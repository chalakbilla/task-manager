@echo off
setlocal
cd /d "%~dp0"
title TaskFlow

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python 3.10+ not found. Install it from https://www.python.org and tick "Add to PATH".
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18+ not found. Install it from https://nodejs.org
  pause
  exit /b 1
)

REM ---- first run: create .env and let the user fill it in ----
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example. Fill in your Supabase and Google values, save, then run launch.bat again.
  notepad ".env"
  pause
  exit /b 0
)
findstr /c:"YOUR-PROJECT" ".env" >nul
if not errorlevel 1 (
  echo .env still has placeholder values. Fill in SUPABASE_URL and the other keys, then run launch.bat again.
  notepad ".env"
  pause
  exit /b 0
)

REM ---- backend: virtualenv + dependencies ----
if not exist ".venv" (
  echo Creating Python virtual environment...
  python -m venv .venv
)
call ".venv\Scripts\activate.bat"
echo Installing backend dependencies...
python -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo [ERROR] pip install failed
  pause
  exit /b 1
)

REM ---- frontend: npm dependencies ----
if not exist "node_modules\concurrently" (
  echo Installing frontend dependencies, this can take a minute...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
  )
)

REM ---- sanity check: can the backend read .env and create the Supabase client? ----
python -c "import backend.db"
if errorlevel 1 (
  echo.
  echo [ERROR] Backend could not start. Check the message above and your .env values.
  pause
  exit /b 1
)

REM ---- open the browser after ~12 seconds, then run Flask + Next.js in THIS window ----
start "" /b cmd /c "ping -n 12 127.0.0.1 >nul & start http://localhost:3000"
echo.
echo Starting TaskFlow on http://localhost:3000   (press Ctrl+C to stop both servers)
echo.
call npm run dev:all
pause
endlocal
