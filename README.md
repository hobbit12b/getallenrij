# Getallenrij

Spel voor groep 1–2 op een staande iPad, met de aangeleverde bosillustraties en vijf magische eikelframes.

## Spelen

https://hobbit12b.github.io/getallenrij/ — open in Safari en kies Deel → Zet op beginscherm voor beeldvullend spelen. Ontworpen voor iPad 9 (810×1080 CSS-pixels).

Kies alleen de computer of een klasgenoot. Gooi, tel de stippen en tik op de juiste plek in je rij. De kaart draait om en verdwijnt in gouden rook: een eikel verschijnt. Gooi je dat getal opnieuw, dan verdwijnen eikel en rook in omgekeerde volgorde en komt de kaart terug. Verzamel zes eikels om te winnen. Beide spelers maken altijd de ronde af en krijgen zo evenveel kaartbeurten.

De dobbelsteen ligt aan de kant van de speler die mag gooien en blijft na de worp aan die kant liggen. Pas nadat de juiste kaart of eikel is aangetikt, schuift hij naar de volgende speler. De worp eindigt recht van boven; de zijkanten zijn dan niet zichtbaar. De oplichtende rij geeft aan welke rij nu gebruikt wordt. De bovenste speler ziet alles 180 graden gedraaid.

## Korte, spannende potjes

Dit is een begeleide speldobbelsteen. De eerste vier worpen per speler zijn onafhankelijk en volledig willekeurig. Daarna bepaalt het spel een bereikbaar paar eindbeurten uit 6, 8 en 10. Dat paar stuurt de resterende worpen: iedere worp verandert nog steeds precies één kaart, met tussendoor mogelijke terugslagen, en de kaartfase eindigt nooit later dan de tiende eigen beurt. Verkeerde keuzes verbruiken geen beurt.

De eindbeurten worden gezamenlijk gekozen om de kans op tegelijk zes eikels op 20% te houden. Ze zijn dus niet onafhankelijk: vanaf de vierde ronde ligt vast in welke ronde iedere rij vol kan worden. Dit is nodig voor de gevraagde kansverdeling; bij twee onafhankelijke spelers met slechts drie mogelijke eindbeurten is de kans op een gelijke finish minstens een derde. Bij verschillende eindbeurten bepaalt het paar ook wie gaat winnen, maar beide spelers hebben vooraf dezelfde kans. Binnen een toegestane route krijgt een herhaling 25% kans wanneer zowel vooruitgang als een terugslag mogelijk is. Op andere momenten is alleen een getal toegestaan dat de geplande eindbeurt haalbaar houdt.

Na vier gewone worpen is de kans op nul eikels 2/27. Als dit beide spelers overkomt, moeten beiden in beurt 10 eindigen. De planning verrekent deze gedwongen gelijke finishes: in overige gevallen kiest ze een gelijke eindbeurt met kans `(0,20 − (2/27)²) / (1 − (2/27)²)`. Daardoor is de totale theoretische kans precies 20%, zonder een vast patroon van bijvoorbeeld elk vijfde potje.

Heeft de startspeler zes eikels, dan krijgt de ander nog zijn beurt in dezelfde ronde. Hebben ze daarna allebei zes eikels, dan gooit ieder één gewone, onbeïnvloede dobbelsteen. De hoogste wint; bij gelijke worpen gooien beiden opnieuw. Deze extra worpen veranderen geen kaarten. De worp van ieder blijft naast zijn karakter zichtbaar. Door gelijke rondes, een symmetrische planning en een symmetrische beslissingsworp heeft elke speler vooraf 50% winstkans. Dit garandeert geen om-en-om winnaars: een reeks overwinningen blijft mogelijk. De extra beslissingsworpen vallen buiten de grens van tien kaartbeurten.

## Rustige begeleiding

De speelknop opent drie korte stappen met beelden en gesproken uitleg: verzamel zes eikels, tik de passende kaart aan, en bij een dubbele worp verandert de eikel terug in een kaart. De uitleg gaat vanzelf verder, kan opnieuw beluisterd worden en kan direct worden overgeslagen.

Bij gelijkspel verschijnt een uitleg zonder leestekst: twee dobbelstenen met een ster bij de hoogste worp. De stem zegt: “Gelijkspel! Gooi allebei. Wie het meeste gooit, wint het spel!” De extra worpen beginnen na de uitleg of via de speelknop. De luidspreker herhaalt de uitleg. De opnamelijst staat in [docs/inspreekteksten.md](docs/inspreekteksten.md).

De eerste beurt van elke menselijke speler krijgt een visueel handje, zonder gesproken uitleg. Het handje wijst eerst naar de dobbelsteen en beweegt daarna naar de geworpen kaart. Vanaf de volgende beurt zoekt het kind zelf. Na 8 seconden wachten volgt een visuele en korte gesproken hint; 18 seconden later kan één concretere hint volgen. Daarna blijft het stil. De luidspreker geeft altijd hulp voor de huidige stap.

De aangeleverde opnames begeleiden de dobbelsteen en het verschijnen en verdwijnen van de eikel. De muziek begint bij ieder nieuw spel met de intro. De loop start aansluitend op dezelfde Web Audio-klok en herhaalt zich. De muziekknop stopt beide muziekbronnen; opnieuw aanzetten begint weer bij de intro. Spelgeluiden blijven hoorbaar wanneer alleen de muziek uitstaat. Gesproken uitleg en hints gebruiken de twintig aangeleverde opnames in `assets/voice`. De uitleg wacht op het einde van de opname. Er wordt geen computerstem gebruikt bij een laadfout. Bij verlaten van de app of de vraag om terug te gaan, worden muziek en lopende spelacties onderbroken.

## Ontwikkeling

Geen externe bibliotheken nodig. `node serve.cjs` opent http://127.0.0.1:4174. `node --test tests/*.test.mjs` controleert spelregels, inhaalmogelijkheden, de maximale speelduur, hints en alle dobbeloriëntaties.
