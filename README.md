# 🏥 Patiente du chat

Mini-jeu Twitch façon **animal virtuel de poche**, sous forme de **widget personnalisé StreamElements** : les viewers soignent une patiente virtuelle en tapant des commandes dans le chat. Ils doivent la garder en vie en surveillant sa santé, son hydratation et sa température, et réagir aux urgences (étouffement, arrêt cardiaque…).

<p align="center">
    <img src="image.png" alt="Aperçu du widget : appareil de poche en forme d'œuf avec un écran LCD montrant la patiente en pixels, ses cœurs, son tracé cardiaque, son hydratation et son thermomètre" width="300">
</p>

Le widget est un appareil de poche en forme d'œuf (coque vert menthe, anneau de porte-clés, plaque « Patiente du chat » à croix rouge, trois boutons). Son écran LCD affiche :

- la **patiente en pixels**, redessinée automatiquement à partir de l'image de son état. Elle respire, tremble quand elle s'étouffe, dort (« Zz ») sous sédation et ne bouge plus pendant un arrêt cardiaque ;
- le **statut** en texte, qui clignote quand il est critique, et une icône **attention** qui s'allume quand la patiente a besoin de soins ;
- un **thermomètre** à segments, un par demi-degré de 35 à 42 °C, qui clignote à 39 °C ou plus ;
- la **santé** en 5 cœurs (un demi-cœur = 10 PV) avec le nombre de PV, et un **tracé cardiaque** pixelisé : plus rapide et plus faible quand la santé baisse, irrégulier à 30 PV ou moins, plat pendant un arrêt cardiaque ;
- l'**hydratation** en 20 segments, un par tranche de 10 % jusqu'à 200 %. Les segments au-delà de 150 % (anasarque) sont hachurés quand ils sont éteints. Les segments allumés clignotent à 25 % ou moins et pendant l'anasarque ;
- le **dernier événement** en texte défilant ;
- **8 icônes de soins** autour de l'écran : manger, eau, médicaments, crème, Heimlich, intubation, sommeil et réanimation. Elles s'allument quand la patiente en a besoin, clignotent quand c'est urgent et s'affichent en négatif quand un viewer utilise la commande correspondante (le bouton du milieu s'enfonce aussi).

Les icônes sont dessinées en pixel art dans `so.js`. Les polices [Fredoka](https://fonts.google.com/specimen/Fredoka) et [VT323](https://fonts.google.com/specimen/VT323) sont chargées depuis Google Fonts.

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

L'anasarque apparaît quand l'hydratation atteint **150 %** et ne disparaît que lorsqu'elle redescend à **120 %** ou moins. Sur l'écran, les segments au-delà de ce seuil sont hachurés.

### Statut affiché

Quand plusieurs problèmes se cumulent, l'écran affiche le plus grave, dans cet ordre. Les statuts critiques clignotent, et l'icône attention s'allume pour tous les statuts sauf « Stable » (elle clignote pour les critiques).

| Priorité | Condition                          | Statut                    | Critique |
|----------|------------------------------------|---------------------------|----------|
| 1        | Arrêt cardiaque                    | ARRÊT CARDIAQUE           | Oui      |
| 2        | Étouffement                        | ÉTOUFFEMENT — !heimlich   | Oui      |
| 3        | Intubée et sédatée                 | Intubée et sédatée        |          |
| 3        | Intubée                            | Intubée et éveillée       |          |
| 4        | PV ≤ 30                            | État critique             | Oui      |
| 5        | Hydratation ≥ 150 %                | ANASARQUE                 |          |
| 6        | Température ≥ 39 °C                | HYPERTHERMIE              | Oui      |
| 7        | Hydratation ≤ 25 %                 | DÉSHYDRATATION            |          |
| 8        | Éruption cutanée                   | Éruption cutanée          |          |
| 8        | Hydratation ≤ 50 %                 | Déshydratée               |          |
| 8        | PV ≤ 60 ou température ≥ 38 °C     | Patiente malade           |          |
| —        | Aucun problème                     | Stable                    |          |

### Icônes de soins

| Icône        | Commandes                             | Allumée quand…                       | Clignote quand…            |
|--------------|---------------------------------------|--------------------------------------|----------------------------|
| Pomme        | `!manger` `!sandwich` `!cacahuetes`   | PV ≤ 60 (et pas intubée)             | PV ≤ 30 (et pas intubée)   |
| Goutte       | `!eau` `!perfusion`                   | Hydratation ≤ 50 %                   | Hydratation ≤ 25 %         |
| Gélule       | `!doliprane` `!lasilix`               | Température ≥ 38 °C ou anasarque     | Température ≥ 39 °C        |
| Crème        | `!creme`                              | Éruption cutanée                     | —                          |
| Poing        | `!heimlich`                           | Étouffement                          | Étouffement                |
| Poumons      | `!intuber` `!extuber`                 | Patiente intubée                     | —                          |
| Lune         | `!hypnovel` `!reveiller`              | Patiente sédatée                     | —                          |
| Cœur         | `!mace`                               | Arrêt cardiaque                      | Arrêt cardiaque            |

Pendant un arrêt cardiaque, seule l'icône de réanimation s'allume.

## Personnalisation

Tout se règle en haut de `so.js` :

- `IMAGES` : URL de l'image pour chaque état. Pour changer une image, téléversez-la dans StreamElements et remplacez l'URL : elle sera redessinée en pixels sur l'écran.
- `HYDRO_MAX` : hydratation maximale (200).
- `HYDRO_CASE` : pourcentage d'hydratation représenté par un segment (10).
- `ANASARQUE_SEUIL` / `ANASARQUE_SORTIE` : seuils d'apparition (150) et de disparition (120) de l'anasarque.
- `THERMO_MIN` / `THERMO_MAX` : bas (35) et haut (42) du thermomètre.
- `WAVE_SPEED` / `WAVE_GAP` / `WAVE_FADE` : vitesse du tracé cardiaque (80 px/s), largeur du trou devant le point d'écriture (40 px) et longueur du fondu de l'ancien tracé (15 px).
- `COMMANDS` : liste des commandes et de leurs alias.

Plus bas dans `so.js` :

- `PIXELS` : dessins en pixel art des icônes et des cœurs (`#` pour un pixel allumé, `.` pour un pixel éteint) ;
- `LCD_ICONS` : pour chaque icône de soins, ses commandes et les conditions qui l'allument ou la font clignoter ;
- `SPRITE_WIDTH` / `SPRITE_HEIGHT` : résolution de la patiente en pixels (64 × 56).

Les 4 teintes de l'écran LCD se règlent dans `so.css` (`--lcd-fond`, `--lcd-encre`…) et dans le filtre `lcd-palette` de `so.html`.

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
so.html   Structure du widget (coque, écran LCD, filtres de couleur de l'écran)
so.css    Apparence du widget
so.js     Logique du jeu, commandes du chat et mise à jour de l'affichage
atelier/  Simulateur local « Atelier : Clone n°3 de Sophie »
  serveur.js    Serveur local (node atelier/serveur.js)
  index.html    Page du simulateur
  atelier.css   Apparence du simulateur
  atelier.js    Pilotage du widget : chat, paramètres, temps, hasard, journal
```
