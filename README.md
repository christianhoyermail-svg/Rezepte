# RezepteApp

Rezepte speichern, Wochenplan würfeln, Rezepte für Cookidoo exportieren. Läuft komplett im Browser, ohne Server.

## Starten
- **Am PC:** `index.html` doppelklicken.
- **Am Handy:** Ordner auf GitHub Pages hochladen (siehe unten), Adresse im Handy-Browser öffnen,
  dann „Zum Startbildschirm hinzufügen“. Danach läuft die App wie eine normale App, auch offline.

## Auf GitHub Pages veröffentlichen (kostenlos)
1. Konto auf github.com anlegen, neues öffentliches Repository erstellen, z. B. `rezepte`.
2. Alle Dateien aus diesem Ordner hochladen („Add file → Upload files“).
3. Settings → Pages → Branch `main` / Ordner `/ (root)` → Save.
4. Nach ~1 Minute erreichbar unter `https://<benutzername>.github.io/rezepte/`.

Alternative: Ordner per Drag & Drop auf https://app.netlify.com/drop ziehen.

Hochladen müssen nur: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`,
`icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (der Ordner `import` nur, wenn gewünscht).

## Auf dem Handy installieren
- **Android (Chrome):** Adresse öffnen → Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone (Safari):** Adresse öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.

Danach startet „Rezepte“ mit eigenem Icon im Vollbild wie eine normale App und funktioniert auch ohne
Internet (nur Rezeptbilder und Schrift brauchen beim ersten Anzeigen Internet).
Nach einem Update der Dateien die App einmal schließen und neu öffnen, dann ist die neue Version da.

## Wo liegen die Daten?
Im Speicher des Browsers (localStorage) auf dem jeweiligen Gerät. **Nicht** in den hochgeladenen Dateien.
PC und Handy haben also getrennte Daten. Übertragen über den Tab „Daten“: Backup herunterladen,
z. B. in Google Drive ablegen, auf dem anderen Gerät importieren.

## Rezeptbilder
Jedes Rezept kann ein Bild haben (Feld „Bild-URL“ im Editor). Die Beispielrezepte und der
Breifreibaby-Import bekommen automatisch passende Beispielbilder von Wikimedia Commons
(freie Lizenzen, Quelle unter dem Bild verlinkt). Bilder werden aus dem Internet geladen.

## Wochenplan als PDF
Im Wochenplan „📄 PDF / Drucken“ tippen. Es öffnet sich der Druckdialog mit einem A4-Layout –
dort als Drucker „Als PDF speichern“ wählen (am iPhone: Teilen → Drucken → „Sichern in Dateien“)
oder direkt drucken.

## Einkaufsliste
Einkaufswagen in der Seitenleiste (oder „🛒 Einkaufsliste“ im Wochenplan). Die Liste enthält alle Zutaten
der im gewählten Zeitraum geplanten Rezepte – gleiche Zutaten werden addiert und nach Supermarkt-Bereichen
sortiert. Einträge antippen zum Abhaken, eigene Einträge ergänzen, als Text kopieren (z. B. für WhatsApp)
oder als PDF drucken (enthält nur noch nicht abgehakte Einträge).

## Favoriten
Herz ♡ auf dem Rezeptfoto antippen, um ein Rezept zu merken. Das Herz in der Seitenleiste (oder der
Schalter „Favoriten“ in der Übersicht) zeigt nur Favoriten – kombiniert mit den Tabs „Kochen“ bzw.
„Backen“ getrennt nach Kategorie.

## Cookidoo (eigene Kreation)
Cookidoo hat keinen Datei-Import, daher werden die Rezepte als Text übertragen:
In Cookidoo „Rezept erstellen“ öffnen, dann in der App kopieren und in das passende Feld einfügen.
- **Titel antippen**: Rezeptname
- **Kopier-Symbol** neben „Zutaten“ bzw. „Zubereitung“: der ganze Abschnitt
- **Antippen einer Zeile**: genau diese Zutat bzw. diesen Schritt (für die einzelnen Schritt-Felder in Cookidoo)
- **Kopier-Symbol in der Seitenleiste** oder **📋 Ganzes Rezept als Text**: alles auf einmal, z. B. zum Teilen
