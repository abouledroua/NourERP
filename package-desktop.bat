@echo off
TITLE Al-Nour Academic & School ERP - Standalone Desktop Packager
chcp 65001 > nul
echo =========================================================================
echo    Al-Nour Academic & School ERP - Standalone Executable Packager
echo    نظام النور الأكاديمي والإداري المتكامل للمدارس - بناء النسخة التنفيذية
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/4] Ensuring Embedded Database Binaries exist...
call node scripts/setup-embedded-db.js

echo [2/4] Building Frontend Production Bundle...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)
cd ..

echo [3/4] Installing Production Backend Dependencies...
cd backend
call npm install --omit=dev
cd ..

echo [4/4] Packaging Standalone Windows NSIS Installer (.exe)...
call npx electron-builder --win nsis
if %errorlevel% neq 0 (
    echo [ERROR] Electron Builder failed!
    pause
    exit /b 1
)

echo.
echo =========================================================================
echo [SUCCESS] Package created in "dist/" directory!
echo Installer: نظام النور الأكاديمي للمدارس Setup.exe
echo =========================================================================
pause
