# 🔧 Solution au problème CORS

## ❌ Le problème

```
Access to fetch at 'https://script.google.com/...' from origin 'http://localhost:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## ✅ La solution (SIMPLE !)

Le problème vient **uniquement de la configuration du déploiement** Google Apps Script.

### 🎯 Configuration CORRECTE du déploiement :

| Paramètre | ❌ MAUVAIS (cause CORS) | ✅ BON (fonctionne) |
|-----------|------------------------|---------------------|
| **Type** | Application Web | Application Web |
| **Exécuter en tant que** | Moi | Moi |
| **Qui peut accéder** | Anyone with a Google Account | **Anyone** |

☝️ **C'est ce dernier paramètre qui fait TOUTE la différence !**

---

## 📋 Étapes détaillées

### 1. Dans Google Apps Script

1. Ouvrez votre projet Apps Script
2. Collez le code de `Code.gs`
3. Cliquez sur **💾 Enregistrer**

### 2. Redéployer correctement

#### Option A : Modifier le déploiement existant

1. **Déployer** → **Gérer les déploiements**
2. Cliquez sur **✏️** (crayon) à côté de votre déploiement
3. Changez **"Qui peut accéder"** → **"Anyone"**
4. Cliquez sur **Déployer**

#### Option B : Créer un nouveau déploiement (recommandé)

1. **Déployer** → **Nouveau déploiement**
2. Cliquez sur **⚙️** → **Application Web**
3. Configurez :
   ```
   Description : Liste de naissance v1
   Exécuter en tant que : Moi
   Qui peut accéder : Anyone  ⚠️ IMPORTANT !
   ```
4. Cliquez sur **Déployer**
5. **Autorisez** l'accès (c'est normal, c'est votre script)
6. **Copiez l'URL** qui finit par `/exec`

### 3. Mettre à jour index.html

Remplacez l'URL à la ligne 65 :

```javascript
const APP_URL = 'https://script.google.com/macros/s/VOTRE_NOUVELLE_URL/exec';
```

---

## 🧪 Tester

1. Ouvrez `index.html` dans votre navigateur
2. Ouvrez la Console (F12)
3. ✅ Vous ne devriez **PLUS** voir d'erreur CORS
4. ✅ Les objets s'affichent correctement
5. ✅ Vous pouvez faire une réservation test

---

## 🤔 Pourquoi ça marche ?

### Explication technique

**"Anyone with a Google Account"** :
- ❌ Nécessite une authentification OAuth
- ❌ Ajoute des headers HTTP complexes
- ❌ Le navigateur envoie une requête "preflight" (OPTIONS)
- ❌ Google Apps Script ne répond pas correctement au preflight
- ❌ **RÉSULTAT : Erreur CORS**

**"Anyone"** (Tout le monde) :
- ✅ Accès public, pas d'authentification
- ✅ Requête HTTP simple
- ✅ Pas de preflight
- ✅ Google Apps Script ajoute automatiquement les headers CORS
- ✅ **RÉSULTAT : Ça fonctionne !**

---

## 🔒 Sécurité

**Q : C'est sécurisé de mettre "Anyone" ?**

**R : OUI**, pour une liste de naissance c'est parfait car :
- ✅ Les données ne sont pas sensibles (prénom + message)
- ✅ Pas de données personnelles critiques
- ✅ Lecture limitée (juste les IDs réservés)
- ✅ Vous recevez un email pour chaque réservation

Si besoin, vous pouvez ajouter :
- Un système de honeypot anti-bot (déjà inclus)
- Une limite de taux (rate limiting)
- Une validation côté serveur

---

## 📧 Bonus : Email de notification

Votre code envoie automatiquement un email à `rivollier.s@gmail.com` pour chaque réservation ! ✉️

Vous pouvez modifier l'email dans `Code.gs` ligne 3 :

```javascript
const NOTIFY_EMAIL = 'votre-email@gmail.com';
```

---

## 🐛 Dépannage

### L'erreur CORS persiste ?

1. ✅ Vérifiez que l'URL finit par `/exec` (PAS `/dev`)
2. ✅ Vérifiez "Qui peut accéder" = **"Anyone"**
3. ✅ Attendez 1-2 minutes (propagation)
4. ✅ Videz le cache du navigateur (Ctrl+Shift+R)
5. ✅ Essayez en navigation privée

### Comment voir les réservations ?

1. Ouvrez le Google Sheet : https://docs.google.com/spreadsheets/d/1swwM4nYI4Icjz4DKeT3pW2sfU-6xlBIYAmvv8PFyoMA/
2. Une feuille "Reservations" contient toutes les réservations

### Comment tout réinitialiser ?

Dans l'éditeur Apps Script :
1. Sélectionnez la fonction `resetAllReservations`
2. Cliquez sur **▶️ Exécuter**

---

## ✨ C'est tout !

Après ces étapes, votre liste de naissance fonctionnera **sans erreur CORS** ! 🎉

Questions ? Vérifiez que "Qui peut accéder" = **"Anyone"** 
C'est LE point crucial ! 🔑



