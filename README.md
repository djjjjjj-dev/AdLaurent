# AdShield - par Djibr1l

Extension Chrome (Manifest V3) de blocage de publicités pour YouTube, Twitch et l'ensemble des sites web.

## 🚀 Installation dans Google Chrome

1. Rendez-vous sur `chrome://extensions` dans Google Chrome.
2. Activez le **Mode développeur** (en haut à droite).
3. Cliquez sur **Charger l'extension non empaquetée** (*Load unpacked*).
4. Sélectionnez le dossier de l'extension

## 🛡️ Fonctionnalités

- **Protection Universelle (Tous les sites Web)** :
  - Blocage des réseaux publicitaires mondiaux via DeclarativeNetRequest (Google Ads, DoubleClick, Taboola, Outbrain, Criteo, Amazon Adsystem, PopAds, etc.).
  - Nettoyage DOM dynamique en temps réel (bannières, encarts sponsorisés, iframes publicitaires, widgets de recommandation).
  - Blocage intelligent des fenêtres pop-up et pop-under intrusives.
  - Neutralisation des publicités vidéo HTML5 sur les sites de streaming et portails d'actualités.
  - **Anti-Adblock Killer automatique** : Déjoue les scripts de détection (BlockAdBlock, FuckAdBlock, Google Funding Choices, Admiral), supprime les modals d'avertissement, débloque le défilement (scroll lock) et retire les flous de paywall/articles.
- **Navigation Propre (Options dédiées dans le popup)** :
  - **Bandeaux cookies / RGPD** : Suppression et neutralisation des bannières de consentement (Didomi, OneTrust, Axeptio, Cookiebot, TarteAuCitron) sans blocage de scroll.
  - **Popups newsletter & Exit-intent** : Élimination des fenêtres d'inscription intempestives et modales de capture d'e-mail.
  - **Vidéos flottantes (Sticky Autoplay)** : Suppression des mini-lecteurs vidéo parasites en bas d'écran lors du défilement.
  - **Nettoyage des liens (Link Cleaner)** : Suppression automatique des paramètres espions (`utm_source`, `fbclid`, `gclid`, etc.) dans la barre d'adresse et au clic sur les liens.
  - Tous ces modules disposent d'un interrupteur individuel dans l'interface pour être activés ou désactivés à tout moment.
- **Historique Détaillé des Sites** :
  - Onglet dédié avec compteur de pubs bloquées par site web.
  - Recherche instantanée par nom de domaine.
  - Horodatage précis (ex: "Il y a 2 min") et catégories de pubs bloquées (Bannières, Vidéos, Popups).
  - Favicons automatiques et possibilité de purger l'historique globalement ou par site.
- **YouTube** :
  - **Chargement instantané (0 délai)** grâce à l'interception in-page des payloads `/player` (`world: MAIN`).
  - Accélération et saut instantané des pubs pré-roll, mid-roll et bumpers.
  - Clic automatique sur les boutons *Passer l'annonce*.
  - Suppression complète des bandeaux et des carrés noirs de la page d'accueil.
  - Bypass des avertissements anti-bloqueur.
- **Twitch** :
  - **Suppression définitive des publicités vidéo (0 pub, 0 coupure)** : Interception in-page (`world: MAIN`) des requêtes GraphQL `PlaybackAccessToken` et nettoyage direct des segments de pub dans les flux HLS M3U8 (`usher.ttvnw.net`).
  - Suppression physique complète (`.remove()`) des bannières, overlays publicitaires et carrousels sponsorisés dans le DOM.
  - **Auto-Claim des Points de chaîne** : Récupération automatique en arrière-plan des coffres de points bonus (+50 pts).
  - Aucune superposition factice ni coupure de son : le stream live continue sans interruption.
- **Popup & Statistiques** :
  - Navigation par onglets (*Protection* et *Historique*).
  - Carte du site actif en direct (*ex: lemonde.fr • 12 bloquées*).
  - Graphique d'activité sur 7 jours.
  - Compteur de coffres et points bonus Twitch récupérés.
  - Temps économisé calculé en direct.
  - Interrupteurs de contrôle pour chaque plateforme et type de contenu.
