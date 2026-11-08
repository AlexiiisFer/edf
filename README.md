# Météo de mon logement — parcours confort d’été

Application Node.js >=18, sans dépendance externe. Démarrer avec `npm start`.

| Page | Rôle |
|---|---|
| `/` | Écran projeté : QR code propre à la session (« Remettre à zéro » / « Nouvelle session » en génère un nouveau), puis déroulé en direct (étape, compte à rebours, chiffres de la salle, plans validés) |
| `/jouer` | Choix « par adresse » (DPE de l’ADEME : seules les questions manquantes sont posées) ou « répondre aux questions » ; 6 questions (région d’abord) → budget et temps (3 profils chacun) + solutions low tech et high tech proposées sur un seul écran → « Valider mon plan » (validation directe, sans récapitulatif) |
| `/stats` | Bilan de la salle (classes des logements, DH RITE moyen avant / avec les solutions, mur des participants avec leurs DH) et onglet « Quand consommer ? » : clim H24 contre heures creuses |

## Interface

Refonte visuelle réalisée avec les skills du dépôt `skills-ui` (Anime.js en particulier) :

- `public/theme.css` : thème commun aux couleurs EDF sur fond blanc (bleu `#07387A` et orange `#FF5E11` du logo), échelle A–G, mur des profils.
- `public/ui.js` : en-tête animé du téléphone (`UI.brandWave` : bande bleue qui part du haut à gauche, ligne orange courbe qui descend vers la droite) et petites chorégraphies Anime.js v4 (entrées en cascade, titres mot à mot, compteurs animés, tracés SVG, rebonds). Elles sont désactivées si « réduire les animations » est actif, et l’interface fonctionne sans elles.
- `public/vendor/anime.umd.min.js` : Anime.js 4.2.2 (MIT, licence dans `public/vendor/ANIME-LICENSE.md`), servi en local pour fonctionner sans CDN.

## Animation

1. Ouvrir `/`, laisser les participants scanner, puis « Commencer ».
2. Chacun répond aux 6 questions de la démo : 45 secondes au maximum (plus tôt si tout le monde a terminé, ou sur « Passer au bilan »). Un participant en retard peut finir ensuite. Pendant ce temps, l’écran affiche en direct l’avancement et des chiffres de la salle à commenter.
3. Les statistiques s’affichent automatiquement **2 minutes après « Commencer »**, avec un compte à rebours à l’écran. « Afficher maintenant » permet de les ouvrir plus tôt. Déroulé de 5 minutes : `PRESENTATION.md`.
4. Les participants choisissent leur budget et leur temps, ajustent les solutions proposées (low tech et high tech sur le même écran), puis valident directement leur plan depuis la barre du bas.
5. Pendant l’affichage des statistiques, les participants peuvent encore continuer ou modifier leur plan.
6. « Nouvelle session » efface toutes les données. Les données sont en mémoire et disparaissent aussi au redémarrage. Le téléphone retrouve son plan validé après rechargement tant que la session existe.

## Questionnaire, météo et équipements

- `public/questions.js` : version démo, 6 questions (région, type de logement, orientation des fenêtres — Nord, Sud, Est, Ouest, plusieurs choix possibles, la façade la plus exposée compte —, protections extérieures, courant d’air nocturne, climatisation). La région fixe la température extérieure du scénario canicule. Chaque réponse modifie l’écart intérieur/extérieur d’un scénario canicule à 35 °C (ajusté selon la zone) : valeurs pédagogiques, pas une étude thermique.
- Les solutions proposées dépendent des équipements déclarés (protections existantes ou non, climatiseur mobile, PAC ou aucune clim).
- Météo automatique : prévision **fictive** de démonstration (pic de canicule de la région jeudi), affichée sur l’écran des solutions.

## Par adresse (DPE)

- Le téléphone cherche l’adresse dans la Base Adresse Nationale (`api-adresse.data.gouv.fr`, appel direct depuis le navigateur).
- Le serveur interroge la base « DPE logements existants » de l’ADEME (`/api/dpe?ban=…` → `data.ademe.fr`) et renvoie les logements de l’adresse ; l’utilisateur choisit le sien.
- `public/dpe.js` pré-remplit région (département), logement traversant, absence de protections extérieures et climatisation. Le reste est demandé (type de logement, fenêtres, type de protections).
- Aucun DPE trouvé, base indisponible ou logement absent de la liste : retour au questionnaire classique.
- En production, le serveur doit pouvoir joindre `data.ademe.fr` et le navigateur `api-adresse.data.gouv.fr`.

## Calcul RITE (Cerema)

- `vendor/rite/RITE_V24.2.xlsm` : outil RITE du Cerema (utilisation libre de droits sous réserve de citer le Cerema).
- `tools/rite_worker.py` garde LibreOffice et le fichier ouverts ; le serveur lui envoie les cas à calculer (≈ 15 ms par calcul, démarrage ≈ 2 s).
- `public/rite.js` traduit les réponses en entrées RITE (approche simplifiée) et chaque solution en modification d’entrée (volets « exemplaire », aération nocturne, brasseur d’air, store extérieur, isolation du toit, isolation des murs par l’extérieur).
- Avec DPE : département exact, T1–T5, isolation des murs et du toit, brasseur d’air et inertie viennent du DPE ; on demande ensuite le type de logement, les fenêtres, les protections, puis couleur du toit, orientation de la chambre, ouverture possible la nuit, horaires des volets et aération nocturne.
- Sans DPE : les 6 questions de base, puis un écran « Affiner » facultatif (jusqu’à 10 questions : les précédentes + pièces, murs, toit, fenêtre du séjour, ventilateur de plafond).
- Les habitudes déjà prises (volets fermés le matin, aération la nuit, ventilateur) font disparaître la solution correspondante.
- Les tuiles indiquent le niveau de coût du guide Cerema 2025 (€ à €€€) quand le guide le donne. Les prix de l’isolation du toit et des murs sont des estimations à vérifier.
- `POST /api/rite` renvoie les DH du logement, le gain de chaque solution prise seule et les DH du plan choisi. Affichage sur le téléphone : carte du haut, badges « −… DH » sur les tuiles, barre du bas, bilan.
- RITE est prévu pour le logement collectif. Les maisons sont estimées comme un logement « sous toiture » à plusieurs façades (en angle, ou traversant en pignon) ; le résultat est affiché « estimation maison ». Sans LibreOffice, le site fonctionne sans RITE (`/health` indique `"rite": false`).
- Le Dockerfile installe LibreOffice Calc et `python3-uno` (image plus lourde, ≈ 400 Mo de plus).

## Aides possibles

- `AIDES` dans `public/solutions.js` : Prime énergie EDF (CEE : PAC air-air, remplacement d’un climatiseur mobile, isolation du toit) et MaPrimeRénov’ en rénovation globale (store extérieur, volets automatiques, brasseur d’air, isolation des murs).
- Le bilan du téléphone liste les aides correspondant aux solutions choisies ; l’onglet « Quand consommer ? » compte les plans validés concernés.
- Sous conditions, montants non affichés : à vérifier sur les sites officiels (EDF, France Rénov’) avant la présentation.

## Estimations

`public/solutions.js` décrit les solutions, en deux groupes (gestes manuels, équipements) : effet supposé sur la température, fourchette de prix indicative (éventuellement au m²), délai de mise en place et temps demandé (geste quotidien, installation unique ou domotique). Liste : volets, aération nocturne, effet cheminée, veilles ; volets clairs, store, brasseur d’air, brumisateur, écran d’alertes, volets auto, pièce refuge (simple ou équipée), vitrage intelligent, cool roof, cheminée solaire, mur végétal, point d’eau, puits canadien, jumeau numérique, rafraîchisseur adiabatique, clim programmée, PAC. Ce sont des **hypothèses pédagogiques**, pas des devis ni une étude thermique.

- Budget (Sans, Petit ≤ 200 €, Moyen ≤ 1 000 €, Large) et temps (Sans, Peu ≤ 2 jours, Un peu ≤ 1 mois, Beaucoup, selon le délai d’installation) filtrent les propositions affichées ; « Sans » (par défaut) affiche tout, et toucher à nouveau un choix actif revient à « Sans ». Rien n’est coché d’avance.
- Après validation, le téléphone affiche un bilan individuel (classe, température, budget, délai) et trois pistes pour aller plus loin.
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
