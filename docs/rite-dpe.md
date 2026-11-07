# Diagnostic confort d'été : RITE + DPE (recherche)

## RITE (Cerema)
- Outil Excel `240905_Outil_RITE_CEREMA_V24.2.xlsm` (téléchargement : lien « Téléchargement de l'outil » sur la page RITE du Cerema, hébergé sur cerema.box.com). Non inclus dans le dépôt.
- Licence : utilisation libre de droits sous réserve de citer le Cerema (notice v23.1).
- Champ d'application : **logements en immeuble collectif** uniquement (pas de maisons, toitures inclinées, fenêtres de toit, altitude, îlots de chaleur).
- Résultat : DH RITE (zone jour + zone nuit), météo caniculaire ≈ 2080. Repères : 0–350 confortable, 350–1000 inconfort probable, > 1000 inconfortable.
- Application en ligne (approche simplifiée) : https://inconfort-thermique.streamlit.app/

### Entrées de l'approche simplifiée (cellules du fichier V24.2)
| Cellule | Entrée | Valeurs (liste) |
|---|---|---|
| Général!C11 | Département | numéro (→ zone climatique) |
| Général!C16 | Type de logement | Tables!G33:G37 (T1…T5) |
| Général!C18 | Situation | Tables!G21:G23 (RdC, étage courant, sous toiture) |
| Général!C20 | Configuration | Tables!G3:G8 (mono-orienté, angle, traversant…) |
| Général!C27 / F27 | Plancher haut (état initial / projeté) | Tables!S2:S7 |
| Général!C35 / G35 | Mur de façade | Tables!S10:S16 |
| Général!C42 / G42 | Plancher bas | Tables!S19:S23 |
| Général!C52 / G52 | Plancher intermédiaire | Tables!R26:R27 |
| Général!C62 / G62 | Cloisonnement | Tables!U26:U29 |
| Méthode simplifiée!C23:E23 | Menuiseries séjour / cuisine / chambre | Tables!K40:K46 |
| Méthode simplifiée!C25:E25 | Protections solaires | Tables!G41:G45 |
| Méthode simplifiée!C27 | Orientation façade séjour | Tables!L4:L11 |
| Méthode simplifiée!C33 | Brasseur d'air | Oui / Non |
| Méthode simplifiée!C38 | Gestion des protections | Standard / Exemplaire |
| Méthode simplifiée!C40 | Gestion des ouvertures | Normale / Contrainte |

**Résultat** : `Méthode simplifiée!A8` (DH total avec effet brasseur) ; `calculs!BN6` (jour) et `calculs!BN8` (nuit).

### Calcul automatique
Les calculs sont des formules (≈ 1 100 : IF, VLOOKUP, SUM, MAX…), pas des macros (les macros servent seulement à l'aide à la saisie). `tools/rite_run.py` modifie des entrées, fait recalculer par LibreOffice sans interface et lit le DH (≈ 3 s par calcul).

```
python3 tools/rite_run.py RITE_V24.2.xlsm '{"base":{},"nord":{"Méthode simplifiée!C27":"Nord"}}'
```

Vérification (exemple fourni T4 Paris sous toiture) : base 439 DH (= valeur enregistrée dans le fichier) ; façade Nord 385 ; sans brasseur 701 ; gestion exemplaire des volets 403 ; Marseille (13) 1003.

## DPE (ADEME)
- API : `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines` (≈ 16 millions de DPE depuis juillet 2021). Adresse → `identifiant_ban` via https://api-adresse.data.gouv.fr/search/
- Champs utiles pour RITE : `code_departement_ban`, `position_logement_dans_immeuble`, `numero_etage_appartement`, `logement_traversant`, `typologie_logement`, `surface_habitable_logement`, `isolation_toiture`, `qualite_isolation_plancher_haut_*`, `qualite_isolation_murs`, `qualite_isolation_plancher_bas`, `classe_inertie_batiment`, `inertie_lourde`, `protection_solaire_exterieure`, `presence_brasseur_air`, et `indicateur_confort_ete` (pour comparaison).
- À demander à l'utilisateur : orientation séjour / chambre, type de menuiseries et de volets, couleur, gestion des volets, ouverture la nuit (bruit, sécurité).

## Coûts (guide Cerema 2025 « Améliorer le confort d'été en logements collectifs »)
Coûts surtout qualitatifs (1 à 3 €) : volets/stores €€ (importance forte), masques €€, inertie/isolation non chiffré, traversants €€€, végétalisation abords €€, matériaux/sols €€, toiture €€€ (peinture claire peu chère ; végétale 60–200 €/m² ; solaire 200–1000 €/m²), vitrages € (sans surcoût notable), brasseurs d'air €€ (100 à 500 € et plus), ventilation naturelle €€, VMC double flux €€ (importance faible).
