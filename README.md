# Météo de mon logement — parcours confort d’été

Application Node.js >=18, sans dépendance externe. Démarrer avec `npm start`.

| Page | Rôle |
|---|---|
| `/` | Écran projeté : QR code, connexions, avancement du questionnaire par thème, puis compteur des plans validés |
| `/jouer` | Questionnaire de 14 questions à son rythme → profil + météo automatique → low tech → high tech → bilan financier |
| `/stats` | Profils de la salle, investissement/bénéfices, et vision « Demain avec EDF & moi » |

## Interface

Refonte visuelle réalisée avec les skills du dépôt `skills-ui` (Anime.js en particulier) :

- `public/theme.css` : thème commun (ciel animé, panneaux translucides, échelle A–G, mur des profils).
- `public/ui.js` : petites chorégraphies Anime.js v4 (entrées en cascade, titres mot à mot, compteurs animés, tracés SVG, rebonds). Elles sont désactivées si « réduire les animations » est actif, et l’interface fonctionne sans elles.
- `public/vendor/anime.umd.min.js` : Anime.js 4.2.2 (MIT, licence dans `public/vendor/ANIME-LICENSE.md`), servi en local pour fonctionner sans CDN.

## Animation

1. Ouvrir `/`, laisser les participants scanner, puis « Commencer ».
2. Chacun répond aux 14 questions (5 thèmes) à son rythme. L’écran passe au bilan quand tout le monde a terminé, à la fin du chrono (2 min 30) ou sur « Passer au bilan ». Un participant en retard peut finir ensuite. Déroulé de 5 minutes : `PRESENTATION.md`.
3. Les participants choisissent leurs actions, ajustent le tarif et leur consommation actuelle de climatisation, puis valident leur plan. Aucune action n’est cochée par défaut.
4. L’animateur choisit « Afficher maintenant » quand il veut ouvrir le bilan collectif. Il n’y a plus de limite de 30 secondes pour choisir les équipements. Les participants peuvent continuer ou modifier leur plan pendant l’affichage des statistiques.
5. « Nouvelle session » efface toutes les données. Les données sont en mémoire et disparaissent aussi au redémarrage. Le téléphone retrouve son plan validé après rechargement tant que la session existe.

## Questionnaire, météo et équipements

- `public/questions.js` : 5 thèmes (environnement, enveloppe, ouvertures, ventilation, équipements), 14 questions. Chaque réponse modifie l’écart intérieur/extérieur d’un scénario canicule à 35 °C (ajusté selon la zone) : valeurs pédagogiques, pas une étude thermique.
- Les solutions proposées dépendent des équipements déclarés (volets existants, Velux, VMC double flux, brasseurs d’air, climatiseur mobile ou PAC…).
- Météo automatique : sur la fiche, le bouton interroge Open-Meteo (gratuit, sans clé) avec la position du téléphone, qui n’est pas enregistrée. Il faut HTTPS (ou localhost) pour la géolocalisation, et l’accès réseau à `api.open-meteo.com`. Sans réseau, la fiche garde le scénario canicule.
- Intégration avec l’appli EDF & moi : proposition présentée dans l’onglet « Demain avec EDF & moi ». Aucune donnée client n’est utilisée.

## Estimations

`public/solutions.js` centralise les coûts indicatifs par équipement/zone, la durée de vie, l’entretien et les effets supposés. Ce sont des **hypothèses pédagogiques**, pas des prix fournisseurs vérifiés, des devis ni une étude thermique. Les prix et effets doivent être calibrés avant un usage de conseil réel.

- Note de confort A–G : scénario fictif, jamais un DPE réglementaire. Seuls les choix sélectionnés modifient les résultats ; les profils non validés restent au point de départ.
- Bilan net à 1, 5 et 10 ans : économies d’électricité moins consommation ajoutée, entretien, achats et renouvellements. Aucun financement, inflation ou aide n’est supposé.
- Référence sans climatisation : 0 kWh de refroidissement. Une nouvelle PAC ajoute un coût d’usage ; aucun achat hypothétique évité n’est compté comme une économie. Le chauffage hivernal n’est pas modélisé.
- Référence avec climatisation (PAC ou climatiseur mobile) : valeur de démonstration de 600 kWh/an, modifiable. Remplacer un mobile par une PAC est compté à 240 kWh/an et 60 € d’entretien. Tarif initial : 0,25 €/kWh, modifiable.
- Pas d’addition directe des économies : réductions multiplicatives plafonnées à 50 %. Un ventilateur améliore le ressenti sans refroidir l’air ; les capteurs seuls ne réduisent pas la température.
- Le serveur recalcule le plan et les statistiques à partir des réponses enregistrées. Les totaux financiers portent sur les plans validés ; une nouvelle validation remplace le plan précédent.

## Vérification

`node --test tests/solutions.test.js`

Le parcours a également été vérifié avec Playwright : téléphones simulés répondant aux 14 questions, modification des réponses, météo (prévision simulée et réseau indisponible), choix, validation et les trois onglets du bilan.

## Logo

Logo officiel récupéré sur le site EDF : https://www.edf.fr/themes/custom/nova/assets/images/00-tokens/logos/images/logo-edf.svg

Il accompagne la mention « Projet proposé pour le défi confort d’été », sans revendication de certification ou d’approbation du projet par EDF.

## Réglages et déploiement

`PORT` : 3000 par défaut. `QUESTIONNAIRE_SECONDS` : 150 par défaut.

Coolify : Dockerfile existant, port 3000. Vérification locale : `curl -fsS http://127.0.0.1:3000/health`.
