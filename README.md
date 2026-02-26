<div align="center">

# 🪙 StudyTokens

**Application de motivation pour les études**  
Gagne des jetons en travaillant, dépense-les en récompenses.

[![Version](https://img.shields.io/badge/version-1.2.0-7b9fff?style=flat-square)](https://github.com/Mickado-Makoto/StudyTokens/releases)
[![Electron](https://img.shields.io/badge/Electron-28-47848f?style=flat-square&logo=electron)](https://electronjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-9-f5820d?style=flat-square&logo=firebase)](https://firebase.google.com)

</div>

---

## 🚀 Lancement rapide

Double-clique sur **`LANCER.bat`** — il installe les dépendances si nécessaire et lance l'app.

```
StudyTokens/
├── LANCER.bat           ← Lance l'app
├── main.js              ← Process principal Electron
├── preload.js           ← Bridge sécurisé main↔renderer
├── firestore.rules      ← Règles de sécurité Firebase (à déployer)
├── assets/              ← Icônes de l'application
└── renderer/            ← Interface utilisateur
    ├── index.html
    ├── js/
    │   ├── config.js          Configuration & constantes
    │   ├── firebase.js        Auth & Firestore (cloud sync)
    │   ├── state.js           État local & utilitaires
    │   ├── timer.js           Logique chrono/pomodoro
    │   ├── pages.js           Rendu des pages
    │   ├── admin.js           Panel d'administration
    │   ├── auth.js            Écran de connexion
    │   ├── sounds.js          Effets sonores (Web Audio API)
    │   ├── notifications.js   Système de notifications
    │   ├── diagnostics.js     Outil de debug (Ctrl+Shift+D)
    │   └── init.js            Orchestration du démarrage
    └── css/
        ├── themes.css         Variables des thèmes
        ├── base.css           Layout principal
        ├── components.css     Composants UI
        ├── timer.css          Écran timer
        ├── admin.css          Panel admin
        ├── auth.css           Écran connexion
        ├── effects.css        Effets visuels
        ├── notifications.css  Toasts & notifications
        └── responsive.css     Responsive & zoom
```

---

## ⚙️ Configuration Firebase

1. Crée un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Active **Authentication** (Email/Password + Google)
3. Active **Firestore Database**
4. Copie tes clés API dans `renderer/js/config.js` → `FIREBASE_CONFIG`
5. Déploie `firestore.rules` dans Firebase Console → Firestore → Règles

---

## 👑 Hiérarchie des rangs

| Rang | Niveau | Accès admin |
|---|---|---|
| 👤 Utilisateur | 0 | — |
| ⭐ Praticien Pro | 1 | — |
| 🛡️ Modérateur | 2 | Dashboard, Utilisateurs, Alertes |
| ⚙️ Administrateur | 3 | + Contenu, Mini-jeux |
| 👑 Fondateur | 4 | Accès complet |

---

## 🔑 Token GitHub (déploiement)

Pour publier des mises à jour depuis le panel admin :

1. GitHub → Settings → Developer settings → **Personal access tokens → Tokens (classic)**
2. Génère un token avec le scope **`repo`** coché
3. Colle-le dans Admin → Paramètres app → GitHub & Déploiement

---

## 🛠️ Build pour distribution

```bash
npm run build        # Build local (.exe installeur)
npm run publish      # Build + upload sur GitHub Releases
```

---

## 🔍 Debug

- **F12** dans l'app → DevTools
- **Ctrl+Shift+D** → Panel de diagnostics intégré
- Logs dans la console au lancement

