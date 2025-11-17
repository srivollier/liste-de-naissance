# 👶 Liste de Naissance / Vauvalahjalista / Baby Registry

Une liste de naissance interactive multilingue (Français, Suomi, English) utilisant Google Sheets comme backend.

## 🌐 Démo en ligne

Votre site sera accessible à l'adresse : `https://[votre-username].github.io/[nom-du-repo]`

## 🚀 Déploiement sur GitHub Pages

### Étape 1 : Créer un dépôt GitHub

1. Allez sur [github.com](https://github.com) et connectez-vous
2. Cliquez sur le bouton **"New"** (nouveau dépôt)
3. Donnez un nom à votre dépôt (par exemple : `liste-de-naissance`)
4. Choisissez **Public** (obligatoire pour GitHub Pages gratuit)
5. **NE cochez PAS** "Add a README file"
6. Cliquez sur **"Create repository"**

### Étape 2 : Pousser vos fichiers sur GitHub

Ouvrez un terminal dans le dossier de votre projet et exécutez ces commandes :

```bash
# Initialiser Git (si ce n'est pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Faire un premier commit
git commit -m "Premier commit - Liste de naissance"

# Lier votre dépôt local au dépôt GitHub
# ⚠️ REMPLACEZ [votre-username] et [nom-du-repo] par vos vraies valeurs
git remote add origin https://github.com/[votre-username]/[nom-du-repo].git

# Pousser les fichiers sur GitHub
git branch -M main
git push -u origin main
```

### Étape 3 : Activer GitHub Pages

1. Sur votre dépôt GitHub, allez dans **Settings** (Paramètres)
2. Dans le menu de gauche, cliquez sur **Pages**
3. Sous **"Source"**, sélectionnez la branche **main** et le dossier **/ (root)**
4. Cliquez sur **Save**
5. Attendez quelques minutes ⏳

🎉 Votre site sera accessible à : `https://[votre-username].github.io/[nom-du-repo]`

## 📋 Configuration requise

### Backend Google Apps Script

Votre fichier `Code.gs` doit être déployé sur Google Apps Script :

1. Allez sur [script.google.com](https://script.google.com)
2. Créez un nouveau projet et collez le contenu de `Code.gs`
3. Configurez le `SHEET_ID` avec votre ID de Google Sheet
4. Déployez en tant que **Web App** :
   - Cliquez sur **Déployer** > **Nouveau déploiement**
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui peut accéder : **Tout le monde**
5. Copiez l'URL de déploiement qui finit par `/exec`

### Mise à jour de l'URL dans index.html

Dans le fichier `index.html`, ligne 87, remplacez l'URL par votre URL de déploiement Google Apps Script :

```javascript
const APP_URL = 'https://script.google.com/macros/s/VOTRE_ID_ICI/exec';
```

## 📊 Structure du Google Sheet

Votre Google Sheet doit avoir 2 feuilles :

### Feuille "List" (les objets)
| Nom | Prix | Lien |
|-----|------|------|
| Poussette | 300€ | https://... |
| Body bio | 20€ | https://... |

### Feuille "Reservations" (générée automatiquement)
| timestamp | item_id | item_label | name | message |
|-----------|---------|------------|------|---------|

## 🌍 Fonctionnalités

- ✅ **Multilingue** : Français, Suomi (Finnois), English
- ✅ **Détection automatique** de la langue du navigateur
- ✅ **Réservation en temps réel** : les objets réservés disparaissent
- ✅ **Protection anti-bot** avec honeypot
- ✅ **Notifications par email** à chaque réservation
- ✅ **Design responsive** avec dark mode automatique
- ✅ **Sans CORS** : utilise des requêtes simples

## 🛠️ Mises à jour

Pour mettre à jour votre site après modifications :

```bash
git add .
git commit -m "Description de vos modifications"
git push
```

GitHub Pages se mettra à jour automatiquement en quelques minutes.

## 📝 Fichiers du projet

- `index.html` : Page web principale (frontend)
- `Code.gs` : Backend Google Apps Script (à déployer séparément)
- `SOLUTION_CORS.md` : Documentation sur la gestion CORS
- `.gitignore` : Fichiers à ignorer par Git

## 🆘 Aide

Si votre site ne fonctionne pas :

1. ✅ Vérifiez que GitHub Pages est activé dans Settings > Pages
2. ✅ Vérifiez que l'URL Apps Script est correcte dans `index.html`
3. ✅ Vérifiez que votre Apps Script est déployé avec accès "Tout le monde"
4. ✅ Ouvrez la console du navigateur (F12) pour voir les erreurs

## 📧 Contact

Pour toute question, consultez la [documentation GitHub Pages](https://docs.github.com/fr/pages).

