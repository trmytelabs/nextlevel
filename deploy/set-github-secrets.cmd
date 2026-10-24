@echo off
REM Run once on this PC after the server is provisioned. Usage: set-github-secrets.cmd <host-or-domain>
if "%~1"=="" ( echo usage: set-github-secrets.cmd nextlevel.example.com & exit /b 1 )
set REPO=trmytelabs/maximalist
gh secret set DEPLOY_HOST --repo %REPO% --body "%~1"
gh secret set DEPLOY_USER --repo %REPO% --body deploy
gh secret set DEPLOY_SSH_KEY --repo %REPO% < "%USERPROFILE%\.ssh\nextlevel_deploy"
ssh-keyscan -H %~1 > "%TEMP%\nl_known_hosts" 2>nul
gh secret set DEPLOY_KNOWN_HOSTS --repo %REPO% < "%TEMP%\nl_known_hosts"
del "%TEMP%\nl_known_hosts"
gh variable set DEPLOY_ENABLED --repo %REPO% --body true
echo Secrets set. Push to main (or run the "Deploy to the server" workflow) to deploy.
