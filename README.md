# Les Veilleuses

Prototype du site de campagne de Maisons des 1000 jours. On regarde une vidéo de formation, on donne son code postal, et un point s'allume sur la carte de France.

## Les fichiers

- `frontend/` : le site
    - `index.html`, `style.css` : la page
    - `app.js` : la vidéo, le formulaire et l'animation de la carte
    - `config.js` : les réglages (mode de test et vidéo)
    - `france-data.js` : les contours des régions et des départements
- `backend/` : l'API en Java / Spring Boot qui enregistre les points

## Deux façons de tester

Le choix se fait avec une seule ligne dans `frontend/config.js` : `apiUrl`.

| | Option 1 : mode démo | Option 2 : avec le backend |
|---|---|---|
| Réglage | `apiUrl: null,` | `apiUrl: 'http://localhost:8080',` |
| À lancer | le site seulement | le site + le backend |
| Points sur la carte | inventés, déjà remplis | les vrais points enregistrés (carte vide au départ) |
| Mon point | s'affiche pendant l'animation, disparaît au rechargement | enregistré, toujours là au rechargement |
| Pour quoi faire | montrer le prototype | tester l'enregistrement |

Pour savoir dans quel mode on est, il suffit de regarder sous le compteur : en mode démo, c'est écrit « données de démonstration ».

Après chaque changement dans `config.js`, recharger la page avec **Cmd+Shift+R** (Ctrl+Shift+R sur Windows), sinon le navigateur garde l'ancienne version.

### Option 1 : mode démo

Rien d'autre à installer. Dans `config.js`, mettre `apiUrl: null,`, puis lancer un serveur local dans `frontend` :

```bash
cd frontend
python3 -m http.server 5500
```

et ouvrir http://localhost:5500. L'extension Live Server de VS Code marche aussi. Python sert juste à lancer ce petit serveur, le site lui-même est en HTML / CSS / JavaScript.

### Option 2 : avec le backend

Il faut Java 21 ou plus et Maven. On utilise deux terminaux.

Terminal 1, le backend :

```bash
cd backend
mvn spring-boot:run
```

Quand on voit `Started VeilleusesApplication`, le serveur tourne sur le port 8080. Le terminal reste ensuite bloqué sur cette ligne : c'est normal, il faut le laisser ouvert (Ctrl+C pour l'arrêter). Les avertissements `sun.misc.Unsafe` au début viennent de Maven, on peut les ignorer.

Pour vérifier que l'API répond : http://localhost:8080/api/points doit afficher quelque chose comme `{"departements":{},"outreMer":0,"total":0}`.

Terminal 2, le site : dans `config.js`, mettre `apiUrl: 'http://localhost:8080',`, puis lancer le serveur du site comme dans l'option 1 et ouvrir http://localhost:5500.

À savoir :

- Les points sont enregistrés dans une base H2, dans `backend/data`. Pour repartir d'une carte vide, arrêter le serveur et supprimer ce dossier.
- Le navigateur se souvient du point qu'on a allumé et affiche directement « Votre point brille en… ». Pour refaire le parcours depuis le début, utiliser une fenêtre de navigation privée.
- Repasser en `apiUrl: null` ne supprime pas les points enregistrés : on les retrouve en remettant l'adresse du backend.

## La vidéo

Dans `config.js`, `videoSrc` donne le chemin vers la vidéo (mp4). Si c'est vide, une petite animation de 3 secondes la remplace.

## Données personnelles

Pour chaque point, on garde seulement le département et la date. L'e-mail, s'il est donné, est stocké à part et n'est pas relié au point.

## Crédits

Contours de la carte : [france-geojson](https://github.com/gregoiredavid/france-geojson) (données IGN / INSEE, Licence Ouverte).
