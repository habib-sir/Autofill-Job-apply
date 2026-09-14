@echo off
REM This script starts the BD Job Autofill SMS Gateway server.
REM Place this folder (windows-autostart) inside your Autofill-Job-apply
REM project folder, next to server.js and package.json.

cd /d "%~dp0.."

if not exist node_modules (
    echo Installing dependencies for the first time, please wait...
    call npm install
)

echo Starting BD Job Autofill SMS Gateway server...
node server.js
