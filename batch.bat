@echo off
echo Initializing Git...
git init
git branch -M main

echo Creating .gitignore...
(
echo node_modules
echo .env
echo frontend/node_modules
echo frontend/build
echo Backend/.env
echo *.zip
echo mern-chat-app-master
) > .gitignore

echo Adding files...
git add .

set /p commitmsg=Enter commit message: 
git commit -m "%commitmsg%"

set /p repourl=Enter GitHub repo URL: 
git remote remove origin 2>nul
git remote add origin %repourl%

echo Pushing to GitHub...
git push -u origin main

pause