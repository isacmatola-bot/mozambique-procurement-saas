# Push this completed project to GitHub

From the project folder:

```bash
git init
git remote add origin https://github.com/isacmatola-bot/mozambique-procurement-saas.git
git add .
git commit -m "Complete procurement SaaS MVP"
git branch -M main
git push -u origin main
```

If the GitHub repository already has placeholder files:

```bash
git pull origin main --allow-unrelated-histories
git add .
git commit -m "Replace placeholder skeleton with working MVP"
git push origin main
```
