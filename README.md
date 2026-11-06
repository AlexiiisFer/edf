# Météo de mon logement — session interactive façon quiz

| Page | Rôle |
|---|---|
| `/` | **Écran à projeter** : QR code + connexions en direct → questions avec chrono → résultats |
| `/jouer` | Ouverte par le QR code : connexion auto, réponses aux questions, résultat perso + défi |
| `/stats` | Statistiques finales de la salle (l'écran y bascule automatiquement) |

## Déroulé
1. Ouvrir `/` sur l'ordi du vidéoprojecteur, les gens scannent.
2. « ▶ Lancer la session » → 5 questions, chrono par question (passe à la suite quand tout le monde a répondu).
3. Chacun voit sa température prévue + son plan + le défi sur son téléphone (30 s).
4. L'écran affiche les statistiques. « Nouvelle session » remet tout à zéro.

## Réglages (variables d'environnement, optionnelles)
- `QUESTION_SECONDS` (défaut 15)
- `RESULT_SECONDS` (défaut 30)

## Coolify
Build pack Dockerfile, port 3000. Données en mémoire (remises à zéro au redémarrage).
