# Météo de mon logement — parcours confort d’été

Application Node.js >=18, sans dépendance externe. Démarrer avec `npm start`.

| Page | Rôle |
|---|---|
| `/` | Écran projeté : QR code, puis déroulé de la démo en direct (étape, compte à rebours, avancement par thème, chiffres de la salle, plans validés) |
| `/jouer` | 6 questions (région d’abord) → budget et temps (3 profils chacun) + solutions low tech et high tech proposées sur un seul écran → « Valider mon plan » (validation directe, sans récapitulatif) |
| `/stats` | Bilan de la salle (classes avant / après, mur des participants) et onglet « Quand consommer ? » : clim H24 contre heures creuses |

## Interface

Refonte visuelle réalisée avec les skills du dépôt `skills-ui` (Anime.js en particulier) :

- `public/theme.css` : thème commun aux couleurs EDF sur fond blanc (bleu `#07387A` et orange `#FF5E11` du logo), échelle A–G, mur des profils.
- `public/ui.js` : petites chorégraphies Anime.js v4 (entrées en cascade, titres mot à mot, compteurs animés, tracés SVG, rebonds). Elles sont désactivées si « réduire les animations » est actif, et l’interface fonctionne sans elles.
- `public/vendor/anime.umd.min.js` : Anime.js 4.2.2 (MIT, licence dans `public/vendor/ANIME-LICENSE.md`), servi en local pour fonctionner sans CDN.

## Animation

1. Ouvrir `/`, laisser les participants scanner, puis « Commencer ».
2. Chacun répond aux 6 questions de la démo : 45 secondes au maximum (plus tôt si tout le monde a terminé, ou sur « Passer au bilan »). Un participant en retard peut finir ensuite. Pendant ce temps, l’écran affiche en direct l’avancement et des chiffres de la salle à commenter.
3. Les statistiques s’affichent automatiquement **2 minutes après « Commencer »**, avec un compte à rebours à l’écran. « Afficher maintenant » permet de les ouvrir plus tôt. Déroulé de 5 minutes : `PRESENTATION.md`.
4. Les participants choisissent leur budget et leur temps, ajustent les solutions proposées (low tech et high tech sur le même écran), puis valident directement leur plan depuis la barre du bas.
5. Pendant l’affichage des statistiques, les participants peuvent encore continuer ou modifier leur plan.
6. « Nouvelle session » efface toutes les données. Les données sont en mémoire et disparaissent aussi au redémarrage. Le téléphone retrouve son plan validé après rechargement tant que la session existe.

## Questionnaire, météo et équipements

- `public/questions.js` : version démo, 6 questions (région, type de logement, orientation des fenêtres, protections extérieures, courant d’air nocturne, climatisation). La région fixe la température extérieure du scénario canicule. Chaque réponse modifie l’écart intérieur/extérieur d’un scénario canicule à 35 °C (ajusté selon la zone) : valeurs pédagogiques, pas une étude thermique.
- Les solutions proposées dépendent des équipements déclarés (protections existantes ou non, climatiseur mobile, PAC ou aucune clim).
- Météo automatique : prévision **fictive** de démonstration (pic de canicule de la région jeudi), affichée sur l’écran des solutions.

## Estimations

`public/solutions.js` décrit les solutions : effet supposé sur la température, prix d’achat indicatif et temps demandé (geste quotidien, installation unique ou domotique). Ce sont des **hypothèses pédagogiques**, pas des devis ni une étude thermique.

- Budget (Petit ≤ 200 €, Moyen ≤ 1 000 €, Large) et temps (Peu, Un peu, Beaucoup) : `recommend()` coche les solutions les plus efficaces qui tiennent dans le budget et le temps choisis ; chacun peut ensuite ajuster.
- « Quand consommer ? » (`OFFERS`, `CLIM_USAGE`) : kWh consommés et coût d’une clim sur 40 jours chauds avec les deux options du Tarif Bleu EDF, Base et Heures Creuses. Les usages comparés sont la clim en continu H24 à 22 °C (0,9 kW, 16 h en heures pleines + 8 h en heures creuses) et la clim programmée aux heures creuses à 26 °C (0,75 kW × 8 h). Prix du kWh TTC au 1er août 2026, hors abonnement : Base 0,2001 €, HP 0,2142 €, HC 0,1589 €. **À vérifier sur la grille officielle avant la présentation.**

- Note de confort A–G : scénario fictif, jamais un DPE réglementaire. Seuls les choix sélectionnés modifient les résultats ; les profils non validés restent au point de départ.
- Gains de température plafonnés à 3,5 °C. Un ventilateur améliore le ressenti sans refroidir l’air ; les capteurs seuls ne réduisent pas la température.
- Le serveur recalcule le plan et les statistiques à partir des réponses enregistrées ; une nouvelle validation remplace le plan précédent.

## Vérification

`node --test tests/solutions.test.js`

Le parcours a également été vérifié avec Playwright : téléphones simulés répondant aux 6 questions, modification des réponses, météo fictive, enchaînement automatique questionnaire → choix → statistiques, choix, validation et bilan de la salle, sans défilement sur les tailles d’écran courantes.

## Logo

Logo officiel récupéré sur le site EDF : https://www.edf.fr/themes/custom/nova/assets/images/00-tokens/logos/images/logo-edf.svg

Il accompagne la mention « Projet proposé pour le défi confort d’été », sans revendication de certification ou d’approbation du projet par EDF.

## Réglages et déploiement

`PORT` : 3000 par défaut. `QUESTIONNAIRE_SECONDS` : 45 par défaut. `TOTAL_SECONDS` : 120 par défaut (de « Commencer » à l’affichage des statistiques).

Coolify : Dockerfile existant, port 3000. Vérification locale : `curl -fsS http://127.0.0.1:3000/health`.
