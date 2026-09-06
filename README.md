# Model Portfolio

Eine bildgetriebene Model-Portfolio-Website, die sich weniger wie eine klassische
Portfolio-Seite und mehr wie ein digitales Model Book, ein Editorial-Archiv und
eine ruhige Fashion-Publikation anfühlt.

Die Fotografie ist das Produkt. Die Oberfläche bleibt deshalb bewusst reduziert
und tritt nur dann in Erscheinung, wenn sie zur Orientierung oder Interaktion
gebraucht wird.

## Vision

Das Portfolio soll unmittelbar in die Bildwelt führen: minimal, editorial,
monochrom, präzise und hochwertig, ohne dekorativ oder demonstrativ luxuriös zu
wirken.

Im Mittelpunkt stehen:

- starke, großformatige Fotografie
- eine ruhige und selbstbewusste Art Direction
- sehr wenig sichtbare Benutzeroberfläche
- bewusster Weißraum statt zusätzlicher UI
- präzise, gezielt eingesetzte Bewegung
- ein eigenständiges Erlebnis auf Desktop und Mobile

Typische Marketing- und Template-Muster wie Hero-Texte, Feature-Karten, Badges,
Verläufe, Glassmorphism, große CTA-Buttons oder permanente Animationen werden
vermieden.

## Öffentliche Experience

Die öffentliche Website besteht aus drei Hauptbereichen und dynamischen
Shooting-Seiten:

| Route            | Bereich  | Aufgabe                                                  |
| ---------------- | -------- | -------------------------------------------------------- |
| `/`              | INDEX    | Kuratierte Shootings als horizontale, unendliche Galerie |
| `/archive`       | ARCHIVE  | Alle veröffentlichten und freigegebenen Fotografien      |
| `/profile`       | PROFILE  | Model-Profil, Angaben, Kontakt und Repräsentation        |
| `/shoots/[slug]` | Shooting | Eigenständige Editorial-Seite eines Shootings            |

Die feste Navigation bleibt auf `INDEX`, `ARCHIVE`, `PROFILE` und `[2026]`
reduziert. Shooting-Seiten sind Teil der Inhaltsstruktur, aber kein eigener
Navigationspunkt.

### INDEX

Die Startseite ist das Portfolio und belegt genau einen Viewport. Statt vertikalem
Seiten-Scroll zeigt sie eine horizontale, scheinbar unendliche Galerie ausgewählter
Shootings.

Jede Karte repräsentiert ein Shooting und verwendet dessen ausgewähltes Cover. Die
Galerie unterstützt:

- Trackpad, Mausrad und Drag-Gesten
- Trägheit und Momentum
- endloses Navigieren durch normalisierte, wiederholte Bildsets
- eine dezente Parallaxe innerhalb der Bilder
- Fokussierung auf das mittlere Bild
- ersten Klick zum Zentrieren, zweiten Klick zum Öffnen
- Wiederherstellung der Galerieposition nach der Rückkehr
- Tastaturnavigation als gleichwertigen Zugangsweg

Auf Mobile bleibt die horizontale Galerie erhalten; Touch-Drag ersetzt Hover als
primäre Interaktion.

### ARCHIVE

Das Archiv zeigt den vollständigen veröffentlichten Bildbestand. Anders als INDEX
zeigt es nicht nur ein Cover je Shooting, sondern alle für das Archiv freigegebenen
Fotos.

- maximal drei Spalten auf Desktop
- zwei Spalten auf Tablet
- eine Spalte auf Mobile
- natürliche Seitenverhältnisse ohne einheitliche Crops
- chronologische Sortierung nach Shooting, danach individuelle Bildreihenfolge
- dezente Metadaten statt dunkler Bild-Overlays
- Klick auf ein Bild führt zum zugehörigen Shooting

Filter nach Jahr, Kategorie, Ort oder Fotograf:in sind eine mögliche spätere
Erweiterung, aber nicht Teil des MVP.

### Shooting-Seiten

Jedes Shooting wird als eigenes vertikales Editorial unter `/shoots/[slug]`
dargestellt. Titel, Jahr, Ort, Beschreibung und Credits erscheinen nur, wenn sie
tatsächlich gepflegt wurden.

Der Bildfluss kombiniert große Landschaftsaufnahmen, einzelne versetzte Portraits
und Portrait-Paare. Für das MVP entsteht diese Variation automatisch aus Format und
Reihenfolge; spätere Layout-Hinweise können einzelne Bilder gezielt steuern.

Am Ende verbinden `PREVIOUS SERIES`, `ARCHIVE` und `NEXT SERIES` die Editorials
miteinander.

### PROFILE

PROFILE ist ein professionelles Model-Profil und kein langer About-Text. Vorgesehen
sind:

- ein starkes Portrait
- Modelname und Base
- kurze Biografie
- Größe und optionale Maße
- Haare, Augen und Schuhgröße
- Agentur oder Repräsentation
- E-Mail und Instagram
- später optional eine herunterladbare Comp Card

Leere Felder werden nicht dargestellt. Auf Desktop stehen Portrait und Angaben
nebeneinander, auf Mobile folgt der Text unter dem Bild.

### `[2026]`-Overlay

`[2026]` öffnet keinen neuen Bereich, sondern legt ein kurzes Statement wie eine
editoriale Bildunterschrift über die aktuelle Seite. Die Seite bleibt darunter
sichtbar und wird lediglich zurückgenommen.

Das Overlay lässt sich per Hintergrund-Klick, Escape und auf Mobile über eine
erkennbare Schließen-Aktion beenden. Fokus und Scroll-Verhalten müssen dabei
barrierefrei behandelt werden.

### Session-Intro

Beim ersten Besuch einer Browser-Session erscheint eine etwa 1,2 bis 1,4 Sekunden
lange „Photographic Slit Reveal“-Animation:

1. schwarzer Viewport und zentrierter Modelname
2. schmaler horizontaler Ausschnitt des ersten Galeriebildes
3. vertikale Öffnung des Ausschnitts zur vollständigen INDEX-Seite
4. dezentes Einblenden der Navigation

Das Intro wird über `sessionStorage` nur einmal pro Session abgespielt, wartet nicht
künstlich auf einen Ladefortschritt und erhält eine kurze Reduced-Motion-Variante.

## Designsystem

Die visuelle Sprache orientiert sich an Fashion-Editorials, Kontaktbögen,
Galerie-Indizes und zurückhaltender Art Direction.

- monochromes Interface; Fotos behalten grundsätzlich ihre beabsichtigte Farbe
- transparente, fast unsichtbare Navigation ohne Container, Schatten oder Blur
- neutrale Grotesk-Schrift, bevorzugt Instrument Sans
- Instrument Serif höchstens als sparsamer editorialer Akzent
- großzügiger Weißraum und ein konzeptionelles 12-Spalten-Raster
- keine Radien, Kartenrahmen oder dekorativen Bildcontainer
- native Seitenverhältnisse und möglichst wenig sichtbare Gallery-Chrome

Motion ist zweckgebunden: Mikrointeraktionen bleiben kurz, Seitenwechsel ruhig und
das Session-Intro der stärkste Bewegungsmoment. Die Bedienung muss auch mit
`prefers-reduced-motion`, Tastatur und Touch vollständig funktionieren.

## Inhaltsmodell

Das zentrale Inhaltsobjekt ist ein **Shooting**. Fotos gehören zu einem Shooting,
INDEX kuratiert Shootings und ARCHIVE zeigt ausgewählte Fotos über alle Shootings
hinweg.

```text
SHOOTING 1 ──────────── * PHOTO
    │
    └── coverPhoto ──────→ PHOTO
```

Ein Shooting enthält unter anderem Titel, Slug, Jahr, optionale Credits,
Veröffentlichungsstatus, INDEX-Sichtbarkeit und ein Cover. Ein Foto speichert
Bild-URL, Maße, Orientierung, Alt-Text, Caption, Reihenfolge und seine Sichtbarkeit
im Archiv beziehungsweise Shooting.

Die Hierarchie ist bewusst selektiv:

```text
INDEX   = stärkste Cover ausgewählter Serien
ARCHIVE = breitere Auswahl aus allen veröffentlichten Arbeiten
SHOOT   = vollständige ausgewählte Serie
```

Ein Shooting kann nur veröffentlicht werden, wenn Titel, eindeutiger Slug, Jahr und
mindestens ein Bild vorhanden sind. Für ein auf INDEX gezeigtes Shooting ist
zusätzlich ein Cover Pflicht.

## Studio

Ein geschützter Bereich unter `/studio` macht die Inhaltsverwaltung ohne
Codeänderungen möglich. Seine Oberfläche bleibt neutral und monochrom, priorisiert
aber Klarheit und Bedienbarkeit vor der extremen Reduktion der öffentlichen Seite.

Geplanter Workflow:

1. im Studio anmelden
2. Shooting anlegen und Metadaten erfassen
3. mehrere Bilder hochladen
4. Bilder per Drag-and-drop sortieren
5. Cover und Archiv-Sichtbarkeit festlegen
6. INDEX-Sichtbarkeit wählen
7. Entwurf ansehen
8. veröffentlichen oder wieder zurückziehen

Veröffentlichte Inhalte erscheinen automatisch auf der Shooting-Seite, im Archiv
und – wenn ausgewählt – auf INDEX. Entwürfe bleiben öffentlich unsichtbar.

Der versteckte Studio-Link im Footer ist ausschließlich eine gestalterische
Entscheidung. Echte serverseitige Authentifizierung und Autorisierung schützen jede
Änderung; es gibt keine öffentliche Registrierung und keine Zugangsdaten im
Frontend.

## Technische Zielarchitektur

Die Konzeptdokumentation empfiehlt für das fertige Produkt:

- Next.js App Router und TypeScript
- handgeschriebenes CSS für den öffentlichen Auftritt
- Motion for React nur dort, wo es Übergänge sinnvoll vereinfacht
- Vercel für Hosting und Preview Deployments
- Vercel Blob für Fotografien
- Postgres, bevorzugt Neon, für Metadaten und Veröffentlichungsstatus
- Drizzle ORM als schlanke, TypeScript-basierte Datenbankschicht
- serverseitige Sessions für den geschützten Studio-Bereich

Das aktuelle Repository ist noch ein React-TypeScript-Vite-Grundgerüst. Das reicht
für einen statischen visuellen Prototyp, deckt die geplanten serverseitigen Aufgaben
wie Authentifizierung, Uploads und Datenbankzugriffe aber nicht allein ab. Vor der
dynamischen Content- und Studio-Phase ist deshalb die in den Konzeptdokumenten
vorgesehene Umstellung auf Next.js ein bewusster Architektur-Schritt.

Motion for React ist bereits als Paket `motion` installiert und später über
`motion/react` importierbar. Es wurde noch keine Produktfunktion implementiert.

## MVP

Das erste vollständige Release umfasst:

- responsive INDEX-Galerie
- ARCHIVE und PROFILE
- dynamische Shooting-Seiten
- Session-Intro und `[2026]`-Overlay
- geschützten Studio-Login
- Shooting-Verwaltung mit Entwurf und Veröffentlichung
- Upload, Sortierung und Löschen von Bildern
- Cover-Auswahl und getrennte INDEX-/ARCHIVE-Sichtbarkeit
- Performance-, Accessibility-, SEO- und Social-Sharing-Grundlagen
- Deployment auf Vercel

Später möglich sind Archivfilter, individuelle Bild-Layouts, Shared-Element-
Transitions, Comp-Card-Download, mehrere Admins, private Draft-Bilder, erweiterte
Bildverarbeitung, Analytics und Content Scheduling.

## Roadmap

1. reale Inhalte und 5–10 repräsentative Shootings vorbereiten
2. öffentliche Experience zunächst statisch gestalten
3. INDEX-Galerie und Interaktionslogik aus dem Personal Portfolio portieren
4. Shooting-Seiten, ARCHIVE und PROFILE visuell finalisieren
5. Postgres-Datenmodell und dynamische Inhalte anbinden
6. Bildspeicher und Upload-Prozess integrieren
7. Studio-Authentifizierung implementieren
8. Shooting-Editor und Publishing-Workflow bauen
9. Motion, Mobile Experience und visuelle Details verfeinern
10. Performance, Accessibility und Deployment abschließen

Die öffentliche Bildwelt wird zuerst validiert. Backend und Studio sollen dieses
Erlebnis unterstützen, nicht seine Gestaltung bestimmen.

## Aktueller Stand

- Produktkonzept, Design Language, Seiten und Interaktionen sind dokumentiert.
- Technische Architektur, Datenmodell, Admin-Workflow und Roadmap sind definiert.
- Das Repository enthält ein lauffähiges React-/Vite-Grundgerüst.
- Motion for React 13 ist installiert.
- Die Abhängigkeiten wurden innerhalb der bestehenden Major-Versionen aktualisiert;
  `npm audit` meldet 0 bekannte Schwachstellen.
- Es wurden noch keine Seiten oder Produktfunktionen programmiert.

## Lokaler Start

Benötigt werden Node.js `^20.19.0`, `^22.13.0` oder `>=24` und npm.

```bash
npm install
npm run dev
```

## Projektdokumentation

- [`docs/00_MASTER_CONCEPT.md`](docs/00_MASTER_CONCEPT.md) – Vision und
  Gesamterlebnis
- [`docs/01_DESIGN_LANGUAGE.md`](docs/01_DESIGN_LANGUAGE.md) – visuelle Sprache und
  Accessibility
- [`docs/02_PAGES_AND_INTERACTIONS.md`](docs/02_PAGES_AND_INTERACTIONS.md) – Seiten,
  Routen und Interaktionen
- [`docs/03_TECHNICAL_ARCHITECTURE_AND_ADMIN.md`](docs/03_TECHNICAL_ARCHITECTURE_AND_ADMIN.md)
  – Zielarchitektur und Studio
- [`docs/04_DATA_MODEL.md`](docs/04_DATA_MODEL.md) – Shooting-, Foto- und
  Veröffentlichungsmodell
- [`docs/05_IMPLEMENTATION_ROADMAP.md`](docs/05_IMPLEMENTATION_ROADMAP.md) –
  Umsetzungsphasen und MVP
- [`docs/06_PORT_FROM_PERSONAL_PORTFOLIO.md`](docs/06_PORT_FROM_PERSONAL_PORTFOLIO.md)
  – Wiederverwendung bestehender Galerie- und Motion-Logik
