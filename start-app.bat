@echo off
TITLE Al-Nour Academic & School ERP - Launcher
chcp 65001 > nul
echo =========================================================================
echo    نظام النور الأكاديمي والإداري المتكامل للمدارس
echo    Al-Nour Academic & School ERP - Startup System
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v18 or higher) to continue.
    pause
    exit /b 1
)

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo [3/3] Launching Al-Nour ERP in Desktop / Development Mode...
call npm run electron:dev

pause
