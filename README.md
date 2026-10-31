# Getallenbos

Spel voor groep 1–2 op een staande iPad, met de aangeleverde bosillustraties en vijf magische eikelframes.

## Spelen

https://hobbit12b.github.io/getallenrij/ — open in Safari en kies Deel → Zet op beginscherm voor beeldvullend spelen. Ontworpen voor iPad 9 (810×1080 CSS-pixels).

Kies alleen de computer of een klasgenoot. Gooi, tel de stippen en tik op de juiste plek in je rij. De kaart draait om en verdwijnt in gouden rook: een eikel verschijnt. Gooi je dat getal opnieuw, dan verdwijnen eikel en rook in omgekeerde volgorde en komt de kaart terug. De eerste speler met zes eikels wint.

De dobbelsteen ligt aan de kant van de speler die mag gooien en rolt richting de volgende speler. Die mag pas gooien nadat de huidige speler zijn kaart of eikel heeft aangetikt. De oplichtende rij geeft aan welke rij nu gebruikt wordt. De bovenste speler ziet alles 180 graden gedraaid.

## Korte, spannende potjes

Dit is een begeleide speldobbelsteen. Alle worpen blijven mogelijk zolang het daarna nog haalbaar is om binnen twaalf eigen beurten zes eikels te verzamelen. De eerste zes worpen zijn volledig willekeurig. Ook later kan een eikel verloren gaan, zelfs bij de tiende worp. Alleen wanneer dat de grens van twaalf beurten zou overschrijden, kiest de worp een nog openliggende kaart. Beide spelers krijgen dezelfde regel; een winnaar wordt niet vooraf gekozen. De winnaar eindigt na 6–12 eigen beurten, bij correct aanklikken (verkeerde keuzes verbruiken geen beurt).

## Rustige begeleiding

De eerste beurt van elke menselijke speler krijgt een visueel handje, zonder gesproken uitleg. Het handje wijst eerst naar de dobbelsteen en beweegt daarna naar de geworpen kaart. Vanaf de volgende beurt zoekt het kind zelf. Na 14 seconden wachten volgt een visuele en korte gesproken hint; 18 seconden later kan één concretere hint volgen. Daarna blijft het stil. De luidspreker geeft altijd hulp voor de huidige stap.

Korte, afwisselende geluidjes begeleiden de worp, het veranderen en de beurtwisseling. De zachte achtergrondmelodie is optioneel via het muzieknootje en staat standaard uit. Nederlandse spraak gebruikt de apparaatstem. Bij verlaten van de app of de vraag om terug te gaan, worden muziek en lopende spelacties onderbroken.

## Ontwikkeling

Geen externe bibliotheken nodig. `node serve.cjs` opent http://127.0.0.1:4174. `node --test tests/*.test.mjs` controleert spelregels, inhaalmogelijkheden, de maximale speelduur, hints en alle dobbeloriëntaties.
