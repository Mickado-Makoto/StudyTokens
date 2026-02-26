/* ================================================
   CONFIG.JS — Constantes et configuration globale
   StudyTokens © 2025
   ================================================ */
'use strict';

const APP_VERSION = '1.2.0';
const GH_TOKEN_KEY = 'ghToken';

// ── Firebase Configuration ─────────────────────
// INSTRUCTIONS : Va sur https://console.firebase.google.com
// Crée un projet → Paramètres → Ajoute une app Web → Copie la config ici
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyALKvs_3amEuUvjwS0BlXN2pww8-arP15g",
  authDomain:        "studytokens.firebaseapp.com",
  projectId:         "studytokens",
  storageBucket:     "studytokens.firebasestorage.app",
  messagingSenderId: "756607954648",
  appId:             "1:756607954648:web:012204b61905a8d83a31ad",
  measurementId:     "G-STV2NLQELJ",
};

// ── Compte Fondateur ───────────────────────────
const FONDATEUR_EMAIL = 'mickaa.leclercq@gmail.com';
// Mot de passe par défaut (changeable dans Paramètres, persistant sur Firebase)
const DEFAULT_FONDATEUR_PASSWORD = '13081308';

// ── Timer ──────────────────────────────────────
const CIRCLE_R = 140;
const CIRCLE_C = 2 * Math.PI * CIRCLE_R;

// ── Thèmes ─────────────────────────────────────
const THEMES = {}; // Thème unique HabboCity — plus de sélecteur

// ── Rangs et permissions ───────────────────────
const ROLES = {
  utilisateur:   { label:'Utilisateur',    emoji:'👤', css:'role-utilisateur',    level:0,
    perms: { themes:['default'], adminPanel:false, manageUsers:false, viewAllStats:false } },
  pro:           { label:'Pro',            emoji:'⭐', css:'role-pro',            level:1,
    perms: { themes:['default'], adminPanel:false, manageUsers:false, viewAllStats:false } },
  moderateur:    { label:'Modérateur',     emoji:'🛡️', css:'role-moderateur',     level:2,
    perms: { themes:['default'], adminPanel:false, manageUsers:false, viewAllStats:true  } },
  administrateur:{ label:'Administrateur', emoji:'⚙️', css:'role-administrateur', level:3,
    perms: { themes:['default'], adminPanel:true,  manageUsers:false, viewAllStats:true  } },
  fondateur:     { label:'Fondateur',      emoji:'👑', css:'role-fondateur',      level:4,
    perms: { themes:['default'], adminPanel:true,  manageUsers:true,  viewAllStats:true  } },
};

// ── Données par défaut ─────────────────────────
const DEFAULT_REWARDS = [
  { id:'r1', emoji:'🎮', name:'Session Gaming',  desc:'1h de jeu sans culpabilité', cost:5,  tags:['loisir'],     palier:0, monthLimit:8   },
  { id:'r2', emoji:'🍕', name:'Pizza Reward',    desc:'Commander une pizza',         cost:10, tags:['nourriture'], palier:1, monthLimit:4   },
  { id:'r3', emoji:'☕', name:'Café Spécial',    desc:'Ton café préféré',            cost:3,  tags:['boisson'],    palier:0, monthLimit:null },
  { id:'r4', emoji:'📺', name:'Série Netflix',   desc:'Un épisode bien mérité',      cost:4,  tags:['loisir'],     palier:0, monthLimit:null },
  { id:'r5', emoji:'😴', name:'Grasse Matinée',  desc:"Dormir jusqu'à midi",         cost:15, tags:['repos'],      palier:2, monthLimit:2   },
  { id:'r6', emoji:'🛍️', name:'Shopping',        desc:'Acheter quelque chose',       cost:20, tags:['argent'],     palier:3, monthLimit:1   },
];

const PALIERS = [
  { tokens:0,   emoji:'🌱', name:'Graine',   desc:'Début du parcours'    },
  { tokens:10,  emoji:'🌿', name:'Pousse',   desc:'Les premières heures' },
  { tokens:25,  emoji:'🌳', name:'Arbre',    desc:'Vraiment motivé(e)'   },
  { tokens:50,  emoji:'⭐', name:'Étoile',   desc:'Régularité exemplaire'},
  { tokens:100, emoji:'🏆', name:'Champion', desc:'Niveau élite'         },
];

const SUBJECTS_DEFAULT = ['Maths','Histoire','Sciences','Anglais','Français'];
const EMOJIS = ['😊','🎯','📚','💡','🧠','⚡','🔥','💪','🎓','🏅','✅','🌟','🚀','💎','🎮','🍕','☕','🎵','🏃','😴'];

// ── Admin ─────────────────────────────────────
const ADMIN_PASSWORD_KEY = 'adminPassword';
const DEFAULT_ADMIN_PASSWORD = '13081308';

// ── Helpers permissions ────────────────────────
function hasPermission(role, perm) {
  return ROLES[role]?.perms?.[perm] === true;
}
function canAccessTheme(role, theme) {
  return ROLES[role]?.perms?.themes?.includes(theme) ?? false;
}
function getRoleLevel(role) {
  return ROLES[role]?.level ?? 0;
}
