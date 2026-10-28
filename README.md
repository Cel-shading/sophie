# 🏥 Patiente du chat

Mini-jeu Twitch sous forme de **widget personnalisé StreamElements** : les viewers soignent une patiente virtuelle en tapant des commandes dans le chat. Ils doivent la garder en vie en surveillant sa santé, son hydratation et sa température, et réagir aux urgences (étouffement, arrêt cardiaque…).

<p align="center">
    <img src="image.png" alt="Aperçu du widget : photo de la patiente, thermomètre, moniteur avec les barres Santé et Hydratation, feuille de soins" width="300">
</p>

Le widget affiche :

- une image qui change selon l'état de la patiente ;
- un thermomètre gradué de 35 à 42 °C, à droite de l'image ;
- le statut sur un bracelet d'identification (vert, orange, rouge ou bleu) posé sur la photo ;
- deux barres crantées sur l'écran d'un moniteur de chevet : **Santé** (un cran tous les 10 PV) et **Hydratation** (un cran tous les 10 %, pleine à 150 %). Elles clignotent en rouge quand la valeur est critique, et la barre d'hydratation passe en violet pendant l'anasarque ;
- une feuille de soins sur porte-bloc avec les 3 derniers événements.

Le style est celui d'un hôpital cartoon : mur vert menthe, plaque du service avec croix rouge, électrocardiogramme qui défile, photo fixée au sparadrap, contours épais et ombres nettes. Les barres et le thermomètre gardent un style de HUD de jeu vidéo. Les polices [Fredoka](https://fonts.google.com/specimen/Fredoka) et [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) sont chargées depuis Google Fonts.

## Installation dans StreamElements

1. Dans le tableau de bord StreamElements, ouvrez **Overlays** et créez (ou modifiez) un overlay.
2. Ajoutez un widget **Static / Custom → Custom widget**.
3. Cliquez sur **Open editor**, puis collez le contenu de chaque fichier dans l'onglet correspondant :

   | Fichier   | Onglet de l'éditeur |
   |-----------|---------------------|
   | `so.html` | HTML                |
   | `so.css`  | CSS                 |
   | `so.js`   | JS                  |

4. Enregistrez et ajoutez l'overlay comme source navigateur dans OBS.

Le widget fait 320 px de large.

## Commandes du chat

Les commandes ne tiennent pas compte des majuscules, des accents ni de la ponctuation qui suit la commande : `!Réveiller !` fonctionne comme `!reveiller`, et `!eau, stp` comme `!eau`. Seul le premier mot du message est lu.

### Nourriture

| Commande      | Alias                                                                                                  | Effet   |
|---------------|--------------------------------------------------------------------------------------------------------|---------|
| `!manger`     | `!repas` `!nourrir` `!nourriture` `!miam` `!mange`                                                     | +5 PV   |
| `!sandwich`   | `!sandwitch` `!sandwiche`                                                                              | +10 PV  |
| `!cacahuetes` | `!cacahuete` `!cacahouete` `!cacahouetes` `!cacahuette` `!cacahuettes` `!arachide` `!arachides` `!peanut` `!peanuts` | +3 PV   |

⚠️ Chaque repas a **1 chance sur 15** de provoquer un étouffement à la place du gain de PV. Impossible de manger pendant un arrêt cardiaque, un étouffement ou une intubation.

### Hydratation et soins

| Commande     | Alias                                                             | Effet                       | Conditions                                    |
|--------------|-------------------------------------------------------------------|-----------------------------|-----------------------------------------------|
| `!eau`       | `!boire` `!hydrater` `!hydratation`                               | +20 hydratation             | Pas en arrêt, pas d'étouffement, pas intubée  |
| `!perfusion` | `!perf`                                                           | +20 hydratation             | Pas en arrêt (fonctionne même intubée)        |
| `!lasilix`   | `!lasix` `!diuretique` `!diuretik` `!diurese`                     | −20 hydratation             | Pas en arrêt                                  |
| `!doliprane` | `!doli` `!paracetamol` `!paracetaml`                              | −1,5 °C (pas sous 36 °C)    | Pas en arrêt                                  |
| `!creme`     | `!cream` `!antihistaminique` `!antihistaminik` `!soignereruption` | Soigne l'éruption cutanée   | Pas en arrêt, éruption présente               |

### Urgences et réanimation

| Commande     | Alias                                                                    | Effet                                    | Conditions                                         |
|--------------|--------------------------------------------------------------------------|------------------------------------------|----------------------------------------------------|
| `!heimlich`  | `!heimlik` `!claque` `!deboucher` `!desobstruer` `!etouffement` `!etouffe` | Stoppe l'étouffement, +15 PV             | La patiente s'étouffe, pas en arrêt                |
| `!intuber`   | `!intubation` `!intube` `!intubee` `!tube`                               | Intube la patiente                       | Moins de 40 PV, pas en arrêt ni en étouffement     |
| `!hypnovel`  | `!sedater` `!sedate` `!sedation` `!endormir` `!dormir` `!hypno`          | Sédate la patiente                       | Patiente intubée                                   |
| `!reveiller` | `!reveil` `!reveile` `!reveille` `!reveillee` `!stopsedation`            | Arrête la sédation                       | Patiente sédatée                                   |
| `!extuber`   | `!extubation` `!extube` `!retirertube` `!retirertuyau`                   | Retire le tube                           | Intubée, réveillée, au moins 50 PV                 |
| `!mace`      | `!cpr` `!massage` `!reanimer` `!reanimation` `!massagecardiaque` `!rcr`  | Met fin à l'arrêt cardiaque              | Patiente en arrêt cardiaque                        |

La réanimation stoppe aussi l'étouffement, remonte les PV et l'hydratation à au moins 30, et ramène la température entre 37 et 38 °C.

## Règles du jeu

### Constantes

| Constante    | Départ | Limites      |
|--------------|--------|--------------|
| Santé (PV)   | 100    | 0 – 100      |
| Hydratation  | 80 %   | 0 – 200 %    |
| Température  | 37 °C  | 30 – 45 °C   |

### Évolution automatique (toutes les 15 secondes)

- L'hydratation baisse de 1 (de 2 si la patiente est sédatée).
- La patiente perd 1 PV. Si elle est intubée, elle en regagne 1 à la place.
- La température revient vers 37 °C de 0,1 °C.
- En cas d'étouffement, il y a 30 % de risque d'arrêt cardiaque.
- À 0 % d'hydratation, elle perd 3 PV supplémentaires.
- À 0 PV, la patiente fait un arrêt cardiaque.
- Il y a 2 % de chance qu'une éruption cutanée apparaisse.
- Sous 38 °C, il y a 3 % de chance d'une poussée de fièvre (+2,5 °C).

Pendant un arrêt cardiaque, l'évolution est figée jusqu'à la réanimation.

### Intubation

Une patiente intubée ne peut ni manger ni boire : il faut l'hydrater avec `!perfusion`. Elle regagne 1 PV toutes les 15 secondes et peut être extubée une fois réveillée et remontée à 50 PV.

### Anasarque (surcharge hydrique)

L'anasarque apparaît quand l'hydratation atteint **150 %** et ne disparaît que lorsqu'elle redescend à **120 %** ou moins. La jauge d'hydratation est pleine à 150 %.

### Statut affiché

Quand plusieurs problèmes se cumulent, le widget affiche le plus grave, dans cet ordre :

| Priorité | Condition                          | Statut                    | Couleur |
|----------|------------------------------------|---------------------------|---------|
| 1        | Arrêt cardiaque                    | 🚨 ARRÊT CARDIAQUE        | Rouge   |
| 2        | Étouffement                        | 😱 ÉTOUFFEMENT — !heimlich | Rouge   |
| 3        | Intubée et sédatée                 | 😴 Intubée et sédatée     | Orange  |
| 3        | Intubée                            | 🫁 Intubée et éveillée    | Orange  |
| 4        | PV ≤ 30                            | 🩺 État critique          | Rouge   |
| 5        | Hydratation ≥ 150 %                | 💧 ANASARQUE              | Bleu    |
| 6        | Température ≥ 39 °C                | 🌡️ HYPERTHERMIE           | Rouge   |
| 7        | Hydratation ≤ 25 %                 | 💧 DÉSHYDRATATION         | Orange  |
| 8        | Éruption cutanée                   | 🔴 Éruption cutanée       | Orange  |
| 8        | Hydratation ≤ 50 %                 | 💧 Déshydratée            | Orange  |
| 8        | PV ≤ 60 ou température ≥ 38 °C     | 🤒 Patiente malade        | Orange  |
| —        | Aucun problème                     | Stable                    | Vert    |

## Personnalisation

Tout se règle en haut de `so.js` :

- `IMAGES` : URL de l'image pour chaque état. Pour changer une image, téléversez-la dans StreamElements et remplacez l'URL.
- `HYDRO_MAX` : hydratation maximale (200).
- `ANASARQUE_SEUIL` / `ANASARQUE_SORTIE` : seuils d'apparition (150) et de disparition (120) de l'anasarque.
- `THERMO_MIN` / `THERMO_MAX` : graduations basse (35) et haute (42) du thermomètre.
- `COMMANDS` : liste des commandes et de leurs alias.

La fréquence de l'évolution automatique est fixée à la fin du fichier : `setInterval(gameTick, 15000)` (en millisecondes).

## Atelier : Clone n°3 de Sophie (simulateur local)

L'atelier fait tourner le vrai widget (`so.html`, `so.css`, `so.js`) dans le navigateur, sans StreamElements ni Twitch. Il faut Node.js, sans aucune dépendance à installer :

```
node atelier/serveur.js
```

Ouvrez ensuite http://localhost:3003/ (pour changer de port : `PORT=3004 node atelier/serveur.js`).

L'atelier permet de :

- **simuler le chat** : envoyer n'importe quel message sous un pseudo choisi, ou cliquer sur une commande, éventuellement plusieurs fois de suite ;
- **modifier chaque paramètre** en direct : curseurs pour la santé, l'hydratation et la température, interrupteurs pour l'anasarque, l'éruption, l'étouffement, l'intubation, la sédation et l'arrêt cardiaque ;
- **contrôler le temps** : pause, vitesse ×1 à ×100, avance d'un ou dix tours de 15 secondes ;
- **forcer le hasard** : tout déclencher (étouffement en mangeant, éruption, fièvre…) ou rien ;
- **charger un scénario** : intubée à 35 PV, poussée de fièvre, bord de l'anasarque, arrêt cardiaque… ;
- **suivre un journal complet** : messages du chat, messages du widget, changements de statut et erreurs JavaScript avec leur ligne dans `so.js`.

Les commandes et les paramètres sont lus directement dans `so.js` : un alias ou un champ ajouté apparaît automatiquement. Le widget se recharge tout seul dès qu'un des trois fichiers est enregistré.

## Tester sans le chat

Le widget réagit à l'événement StreamElements `onEventReceived`. Pour simuler un message, ouvrez la console du navigateur sur la page où tourne le widget (en sélectionnant le cadre du widget si besoin) et lancez :

```js
window.dispatchEvent(new CustomEvent("onEventReceived", {
  detail: {
    listener: "message",
    event: { data: { text: "!eau", displayName: "Testeur" } }
  }
}));
```

## Structure du projet

```
so.html   Structure du widget (image, thermomètre, badge, jauges, journal)
so.css    Apparence du widget
so.js     Logique du jeu, commandes du chat et mise à jour de l'affichage
atelier/  Simulateur local « Atelier : Clone n°3 de Sophie »
  serveur.js    Serveur local (node atelier/serveur.js)
  index.html    Page du simulateur
  atelier.css   Apparence du simulateur
  atelier.js    Pilotage du widget : chat, paramètres, temps, hasard, journal
```
