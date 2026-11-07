# Météo de mon logement — parcours confort d’été

Application Node.js >=18, sans dépendance externe. Démarrer avec `npm start`.

| Page | Rôle |
|---|---|
| `/` | Écran projeté : QR code, connexions, 5 questions, puis compteur des plans validés |
| `/jouer` | Profil initial → sélection low tech → sélection high tech facultative → bilan financier |
| `/stats` | Mosaïque des profils et onglet investissement/bénéfices de la salle |

## Animation

1. Ouvrir `/`, laisser les participants scanner, puis « Commencer ».
2. Les questions avancent au chrono ou après les réponses de tous les participants.
3. Les participants choisissent leurs actions, ajustent le tarif et leur consommation actuelle de climatisation, puis valident leur plan. Aucune action n’est cochée par défaut.
4. L’animateur choisit « Afficher maintenant » quand il veut ouvrir le bilan collectif. Il n’y a plus de limite de 30 secondes pour choisir les équipements. Les participants peuvent continuer ou modifier leur plan pendant l’affichage des statistiques.
5. « Nouvelle session » efface toutes les données. Les données sont en mémoire et disparaissent aussi au redémarrage. Le téléphone retrouve son plan validé après rechargement tant que la session existe.

## Estimations

`public/solutions.js` centralise les coûts indicatifs par équipement/zone, la durée de vie, l’entretien et les effets supposés. Ce sont des **hypothèses pédagogiques**, pas des prix fournisseurs vérifiés, des devis ni une étude thermique. Les prix et effets doivent être calibrés avant un usage de conseil réel.

- Note de confort A–G : scénario fictif, jamais un DPE réglementaire. Seuls les choix sélectionnés modifient les résultats ; les profils non validés restent au point de départ.
- Bilan net à 1, 5 et 10 ans : économies d’électricité moins consommation ajoutée, entretien, achats et renouvellements. Aucun financement, inflation ou aide n’est supposé.
- Référence sans climatisation : 0 kWh de refroidissement. Une nouvelle PAC ajoute un coût d’usage ; aucun achat hypothétique évité n’est compté comme une économie. Le chauffage hivernal n’est pas modélisé.
- Référence avec climatisation : valeur de démonstration de 600 kWh/an, modifiable. Tarif initial : 0,25 €/kWh, modifiable.
- Pas d’addition directe des économies : réductions multiplicatives plafonnées à 50 %. Un ventilateur améliore le ressenti sans refroidir l’air ; les capteurs seuls ne réduisent pas la température.
- Le serveur recalcule le plan et les statistiques à partir des réponses enregistrées. Les totaux financiers portent sur les plans validés ; une nouvelle validation remplace le plan précédent.

## Vérification

`node --test tests/solutions.test.js`

Le parcours a également été vérifié avec Playwright : 80 participants simulés, 400 réponses, sélection mobile, calcul, rechargement, validation, navigation de l’écran projeté et affichage du logo.

## Logo

Logo officiel récupéré sur le site EDF : https://www.edf.fr/themes/custom/nova/assets/images/00-tokens/logos/images/logo-edf.svg

Il accompagne la mention « Projet proposé pour le défi confort d’été », sans revendication de certification ou d’approbation du projet par EDF.

## Réglages et déploiement

`PORT` : 3000 par défaut. `QUESTION_SECONDS` : 15 par défaut.

Coolify : Dockerfile existant, port 3000. Vérification locale : `curl -fsS http://127.0.0.1:3000/health`.
