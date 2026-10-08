@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 24 LTS and run this file again.
  pause
  exit /b 1
)
node scripts/start-windows.mjs %*
set "ACE_START_EXIT=%ERRORLEVEL%"
if not "%ACE_START_EXIT%"=="0" (
  echo.
  echo Startup failed. Read the error above.
  pause
)
exit /b %ACE_START_EXIT%
