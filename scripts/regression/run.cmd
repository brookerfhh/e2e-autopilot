@echo off
REM Launch the Playwright UI for the stable-page regression suite.
REM
REM Usage (from the recipe-site-frontend directory):
REM   scripts\regression\run.cmd <SessionId>             QA, interactive UI mode
REM   scripts\regression\run.cmd <SessionId> local       local dev (port 6443)
REM   scripts\regression\run.cmd <SessionId> local 6444  local dev on a custom Vite port
REM
REM SessionId: DevTools, Application, Cookies, copy the "SessionId" value.
REM It is a live credential; do not share it; it expires after a few hours.

setlocal

if "%~1"=="" (
  echo ERROR: missing SessionId.
  echo Usage: run.cmd ^<SessionId^> [local] [port]
  exit /b 1
)

cd /d "%~dp0..\.."

set "SESSION_ID=%~1"
if /I "%~2"=="local" set "TARGET=local"
if not "%~3"=="" set "LOCAL_PORT=%~3"

npx playwright test --ui

endlocal