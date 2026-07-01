@echo off
REM One-time login (re-run every few hours when the session expires).
REM Opens a browser: log into QA, then press Enter in this window.
REM Your session is saved to scripts\test-auth\auth.json, so `npm test` / run.cmd
REM then work WITHOUT copying a SessionId by hand.

cd /d "%~dp0"
echo Opening a browser. Log into QA, then come back here and press Enter...
npx ts-node -P tsconfig.scripts.json scripts/test-auth/save-auth.ts