# Météo de mon logement — session interactive

| Page | Rôle |
|---|---|
| `/` | **Lobby** à projeter : QR code + personnes qui se connectent en direct + bouton « Lancer la session » |
| `/jouer` | Page ouverte par le QR code : connexion auto, attente, puis 5 questions → température prévue chez soi + plan + défi |
| `/stats` | **Statistiques** de la salle en direct (moyennes, défi fraîcheur, gestes choisis, %) |

## Déroulé
1. Ouvrir `/` sur l'ordi du vidéoprojecteur → les gens scannent, les connexions apparaissent.
2. « Lancer la session » (mot de passe = `ADMIN_TOKEN`, demandé une seule fois) → tous les téléphones démarrent, l'écran passe sur `/stats`.
3. « Nouvelle session » sur le lobby remet tout à zéro.

Astuce : `/?admin=MOTDEPASSE` enregistre le mot de passe d'avance. `/stats?objectif=300` change l'objectif de la jauge.

## Coolify
Build pack Dockerfile, port 3000, variable `ADMIN_TOKEN`. Données en mémoire (remises à zéro au redémarrage).
