# Météo de mon logement — démo interactive

- `/` : parcours sur le téléphone (5 questions → température prévue chez soi + plan + défi)
- `/ecran` : tableau de bord à projeter (QR code + résultats de la salle en direct)
- `/ecran?admin=MON_TOKEN` : affiche le bouton « Réinitialiser » (à utiliser juste avant le passage)
- `/ecran?objectif=300` : change l'objectif de la jauge (200°C par défaut)

## Lancer en local
```bash
node server.js   # http://localhost:3000
```

## Déployer sur Coolify
1. Pousser ce dossier sur un dépôt Git (GitHub/GitLab).
2. Coolify → New Resource → Application → choisir le dépôt → Build Pack : **Dockerfile**.
3. Port exposé : **3000**.
4. Variable d'environnement : `ADMIN_TOKEN=un-mot-de-passe`.
5. Ajouter un domaine en HTTPS, déployer.

Les données sont en mémoire : un redémarrage remet tout à zéro (voulu pour une démo).
