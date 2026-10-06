@echo off
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:5173"
  node server.mjs
  exit /b
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  start "" "http://127.0.0.1:5173"
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
  exit /b
)
echo Node.js runtime not found. Install Node.js or run from the Codex terminal.
pause
