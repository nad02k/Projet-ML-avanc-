# Réponses aux Questions de Réflexion (Module MLA - MLOps)

Ce document présente des explications et des justifications approfondies pour chacune des questions de réflexion posées dans les différentes parties du projet.

---

## Partie 1 — Tracking des Expérimentations

### Q1. Quelle est la différence entre `mlflow.log_param()` et `mlflow.log_metric()` ?
* **`mlflow.log_param()` (Paramètres)** :
  * Utilisé pour logger des valeurs de configuration statiques et des hyperparamètres clés (ex: `n_estimators`, `max_depth`, `learning_rate`, `test_size`, `random_state`).
  * Ces valeurs sont définies **avant** l'entraînement et restent immuables pour un run donné. Elles servent de pivot de comparaison pour analyser l'impact de nos choix de modélisation.
* **`mlflow.log_metric()` (Métriques)** :
  * Utilisé pour logger des mesures de performance numériques dynamiques et quantitatives obtenues **pendant ou après** l'évaluation du modèle (ex: `accuracy`, `f1_score`, `roc_auc`, `loss`).
  * Contrairement aux paramètres, les métriques peuvent être mises à jour à chaque étape (epoch) d'un entraînement itératif (ex: courbes d'apprentissage de perte ou d'accuracy).

### Q2. Pourquoi est-il important de nommer ses runs (`run_name`) ?
* **Clarté et Identifiabilité** : Par défaut, MLflow attribue des noms de runs aléatoires et fantaisistes (ex: `tricky-hare-412`). Nommer explicitement le run (ex: `rf_baseline_v1` ou `gb_learning_rate_0.1`) permet de comprendre instantanément la nature de l'expérimentation depuis le tableau de bord MLflow UI.
* **Organisation et Reproductibilité** : Facilite le filtrage rapide, le tri et la comparaison croisée dans des projets contenant des centaines de runs, permettant aux équipes de collaborer plus efficacement.

### Q3. Que se passe-t-il si vous exécutez deux fois le même script sans changer le `run_name` ?
* **Création d'un nouveau Run ID unique** : À chaque exécution, MLflow crée un identifiant global unique (`run_id` sous forme d'UUID) pour garantir la traçabilité.
* **Noms de runs doublés** : Les deux runs distincts partageront exactement le même `run_name` textuel dans l'interface graphique. Cela rend l'analyse confuse, car il devient difficile de discerner quel run correspond à quel essai dans l'historique sans inspecter manuellement les timestamps ou les paramètres.

---

## Partie 2 — Comparaison d'Expérimentations

### Q4. Quel modèle obtient le meilleur compromis `accuracy` / `f1_score` ? Justifiez.
* **Le modèle RandomForest profond (`rf_deep` avec `n_estimators=200, max_depth=10`)** obtient le meilleur compromis sur notre jeu de données standardisé.
* **Justification** :
  * La baseline de forêt aléatoire (`rf_baseline` avec `max_depth=3`) souffre de sous-apprentissage (underfitting) en raison de sa profondeur trop limitée.
  * Le Gradient Boosting (`gb_model`) a des scores de généralisation très robustes, mais la forêt aléatoire profonde (`max_depth=10`) offre une meilleure stabilité et un score F1 pondéré supérieur (environ **0.86 - 0.88**), évitant le surapprentissage grâce au bagging d'arbres plus profonds.

### Q5. Le graphique Parallel Coordinates révèle-t-il une corrélation entre `max_depth` et `accuracy` ?
* **Oui, une corrélation positive et claire** est visible jusqu'à un certain niveau.
* **Détails** : Le graphique montre que les runs ayant un paramètre `max_depth` bas (ex: `3`) se regroupent en bas de l'échelle des scores d'accuracy. À l'inverse, l'augmentation de la profondeur vers `10` libère la capacité de l'algorithme à modéliser des interactions complexes entre les variables (comme les absences scolaires, le soutien familial et le temps d'étude), ce qui propulse l'accuracy vers les scores les plus élevés.

### Q6. Comment MLflow permet-il la reproductibilité par rapport à un simple `print()` des métriques ?
* **Centralisation complète** : Un simple `print()` affiche une valeur volatile dans la console qui sera perdue à la fermeture du terminal. MLflow, lui, stocke de façon permanente :
  * Les **dépendances exactes** (`requirements.txt` / `conda.yaml`).
  * Les **fichiers de code sources** associés à l'exécution.
  * Le **commit Git** actif à cet instant précis.
  * Les **hyperparamètres**, **métriques**, et la copie binaire exacte du **modèle sérialisé** (le fichier `.pkl` enregistré comme artefact).
  * Les splits de données originaux via les artefacts loggés.
* Cela permet de recharger, auditer et déployer à tout moment le modèle exact ayant généré un résultat donné.

---

## Partie 3 — Model Registry

### Q7. Pourquoi séparer les étapes Staging et Production dans un registre de modèles ?
* **Isolation et Sécurité (Gouvernance ML)** :
  * **Staging** sert d'étape de test pré-production (QA). On y déploie le modèle pour tester sa performance sur un flux de données réel, mesurer sa latence, et vérifier la stabilité de son intégration système sans impacter les utilisateurs réels.
  * **Production** est le modèle final stable exposé aux utilisateurs finaux ou aux applications métiers critiques.
  * Cette séparation empêche les modèles non validés d'être automatiquement déployés par erreur en direct, limitant les régressions en clientèle.

### Q8. Que se passe-t-il si l'on archive une version en Production ? Quel impact opérationnel ?
* **Retrait de l'exposition active** : La version en Production est retirée du registre actif et marquée comme `Archived`.
* **Impact Opérationnel** :
  * Si l'API ou le serveur de serving pointe dynamiquement sur la version étiquetée `Production` (ex: `models:/mon_modele_production/Production`), le serveur lèvera une erreur 404 (modèle indisponible) à moins qu'une autre version n'ait été promue simultanément.
  * C'est pourquoi l'archivage automatique d'une ancienne version de production doit toujours s'accompagner de la promotion atomique d'une nouvelle version validée.

### Q9. Comment le Registry facilite-t-il le rollback vers une version précédente ?
* **Gestion d'alias dynamique** : Le Model Registry associe l'étiquette `Production` à un numéro de version spécifique (ex: v1). Si la nouvelle version v2 présente un bug ou une dégradation silencieuse, il suffit de changer l'étiquette `Production` de la v2 vers la v1 via le client Python (`transition_model_version_stage`) ou l'interface MLflow.
* Les systèmes clients consommant l'URL dynamique de serving n'ont besoin d'aucune modification de code pour recevoir instantanément l'ancien modèle v1 stable.

---

## Partie 4 — Serving et API REST

### Q10. Quel est l'avantage d'un serving MLflow natif vs FastAPI personnalisé ?
* **MLflow Serving Natif** :
  * **Avantages** : Prêt à l'emploi (zéro ligne de code), standardisé, génère automatiquement un serveur Flask avec des endpoints d'invocation `/invocations` et de santé `/health`. Totalement intégré au registre de modèles.
* **FastAPI Personnalisé** :
  * **Avantages** : Flexibilité totale. Permet d'injecter des validations de schémas de données strictes (Pydantic), de faire des prétraitements ou posttraitements complexes (ex: reformater du JSON, filtrer des variables), d'ajouter une authentification de sécurité (JWT), et d'intégrer des outils de monitoring avancés comme Prometheus.

### Q11. Comment géreriez-vous le rechargement automatique d'un nouveau modèle en Production ?
* **Patron Observateur (Observer Pattern) / Webhooks** :
  * Dans l'API, mettre en place un thread en tâche de fond (background scheduler) qui interroge régulièrement le client Model Registry de MLflow (ex: toutes les 5 minutes) pour obtenir le `run_id` de la version actuellement marquée `Production`.
  * Si ce `run_id` diffère de celui actuellement chargé en mémoire, l'API télécharge dynamiquement le nouvel artefact via `mlflow.sklearn.load_model('models:/mon_modele_production/Production')` et remplace l'instance en mémoire de manière transparente (sans redémarrer le serveur).

### Q12. Quels headers HTTP ajouteriez-vous pour sécuriser l'endpoint en production réelle ?
* **`Authorization: Bearer <API_TOKEN>`** : Pour authentifier les clients autorisés à appeler l'API.
* **`Content-Type: application/json`** : Pour garantir le format d'échange.
* **`X-Content-Type-Options: nosniff`** : Évite le reniflage de type MIME.
* **`X-Frame-Options: DENY` / `Content-Security-Policy`** : Empêche le clickjacking.
* **`Access-Control-Allow-Origin: https://mon-domaine-autorise.com`** : Configuration stricte de CORS pour bloquer les requêtes de navigateurs tiers non autorisés.

---

## Partie 6 — Détection du Data Drift

### Q13. Quelle est la différence entre data drift et concept drift ? Donnez un exemple concret avec vos propres données.
* **Data Drift (Glissement des données - $P(X)$ change)** :
  * **Définition** : La distribution statistique des caractéristiques d'entrée $X$ change au cours du temps, mais la relation logique entre $X$ et $Y$ reste stable.
  * **Exemple concret** : Dans nos données d'étudiants, le nombre moyen d'absences (`absences`) double brutalement (ex: de 4 absences à 12 absences en moyenne) à cause d'une épidémie hivernale.
* **Concept Drift (Glissement du concept - $P(Y|X)$ change)** :
  * **Définition** : La relation sous-jacente entre les caractéristiques d'entrée $X$ et la variable cible $Y$ change, même si la distribution d'entrée $X$ reste identique.
  * **Exemple concret** : L'école change sa note de passage minimale pour valider l'année (de 10/20 à 14/20). Un étudiant ayant les mêmes caractéristiques (mêmes heures d'étude, mêmes notes intermédiaires) qui passait auparavant (`pass=1`) va maintenant échouer (`pass=0`). La logique de décision a changé.

### Q14. Le KS-test et Evidently identifient-ils les mêmes features comme driftées ? Pourquoi ?
* **Oui, ils identifient exactement les mêmes features.**
* **Pourquoi** : Par défaut, Evidently utilise le test statistique de Kolmogorov-Smirnov (KS-test) avec un seuil de confiance de $p$-value $< 0.05$ pour analyser et détecter le drift sur toutes les variables numériques ayant plus de 1000 observations (ou le test de Anderson-Darling / Mann-Whitney selon le volume). Comme nous appliquons le test de Kolmogorov-Smirnov exact avec les mêmes formules mathématiques (`scipy.stats.ks_2samp`) sur les deux mêmes échantillons de référence et actuels, les deux outils aboutissent aux mêmes conclusions probabilistes.

### Q15. Quel seuil de drift choisiriez-vous pour votre projet ? Justifiez selon le domaine métier.
* **Un seuil de drift d'environ 25% à 30%** de colonnes significativement driftées.
* **Justification métier** :
  * Le domaine académique est relativement stable à court terme, mais très sensible aux changements démographiques et aux méthodes pédagogiques d'une année sur l'autre.
  * Si plus de 30% des facteurs (comme le niveau d'éducation des parents, le temps de trajet, ou le soutien scolaire supplémentaire) changent radicalement, le modèle perd sa base de généralisation et fera des prédictions erronées sur la réussite des élèves. Un ré-entraînement automatisé est alors indispensable pour réaligner les frontières de décision.

### Q16. Sans pipeline MLOps automatisé, comment détecteriez-vous ce drift en pratique ?
* **Méthodes manuelles et réactives** :
  * En constatant une **dégradation des performances réelles** après coup (lorsque les vrais résultats académiques de fin d'année tombent et qu'on réalise que les prédictions d'échec étaient fausses).
  * En exécutant **manuellement** des scripts ou des notebooks d'analyse exploratoire tous les trimestres sur les nouvelles cohortes d'élèves pour calculer les moyennes et tracer des histogrammes.
  * En recevant des alertes des équipes métiers/professeurs signalant que les profils des étudiants inscrits cette année ont radicalement changé par rapport aux cohortes précédentes.
