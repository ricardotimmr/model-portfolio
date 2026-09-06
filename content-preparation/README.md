# Content Preparation

Dieser Ordner sammelt die realen Inhalte für Phase 0. Er ist eine Arbeitsablage und
noch nicht das spätere Datenbank- oder Upload-Format der Anwendung.

## Zwei Shootings reichen zum Start, drei sind noch besser

Mit zwei echten Shootings können wir bereits alle Kernfälle prüfen. Das dritte
Shooting sorgt zusätzlich für mehr visuelle Variation und eine realistischere
Kuration:

- Portrait-, Landscape- und Square-Formate
- Größen und Abstände der INDEX-Karten
- Drag-, Center- und Infinite-Gallery-Verhalten
- ARCHIVE-Raster
- automatische Bildabfolge auf einer Shooting-Seite
- Cover-Auswahl, Credits, Alt-Texte und Captions

Für den Infinite-Effekt werden die beiden Cover im Prototyp intern als wiederholte
Slide-Sets gerendert. Du musst dafür keine Bilder duplizieren. Vor der finalen
Kuration und dem Performance-Test können später weitere Shootings ergänzt werden.

## Vorgehen

1. `site/identity.md`, `site/contact.md`, `site/year-statement.md` und
   `site/domain.md` ausfüllen.
2. `profile/profile.md` ausfüllen und ein Portrait in `profile/portrait/` ablegen.
3. Die drei Shooting-Ordner sinnvoll umbenennen, zum Beispiel
   `01-coastal-light`, `02-studio-test` und `03-winter-editorial`.
4. Je Shooting `shooting.md` ausfüllen.
5. Web-Exporte in den jeweiligen `images/`-Ordner kopieren.
6. Für jedes Bild eine Zeile in `photos.csv` ergänzen und genau ein Cover wählen.
7. Den Stand in `content-checklist.md` abhaken.

Unbekannte optionale Angaben dürfen leer bleiben. Die öffentliche Website zeigt
später keine leeren Labels.

## Struktur

```text
content-preparation/
├── content-checklist.md
├── site/
│   ├── identity.md
│   ├── contact.md
│   ├── year-statement.md
│   └── domain.md
├── profile/
│   ├── profile.md
│   └── portrait/
│       └── README.md
└── shootings/
    ├── 01-shooting-name/
    │   ├── shooting.md
    │   ├── photos.csv
    │   └── images/
    │       └── README.md
    ├── 02-shooting-name/
        ├── shooting.md
        ├── photos.csv
        └── images/
            └── README.md
    └── 03-shooting-name/
        ├── shooting.md
        ├── photos.csv
        └── images/
            └── README.md
```

## Bildvorbereitung

- bevorzugt JPEG oder WebP, alternativ PNG oder AVIF
- Web-Export in sRGB
- lange Kante ungefähr 3000–4000 px
- keine RAW-Dateien
- möglichst keine 50–100 MB großen Kameraoriginale
- sprechende, stabile Dateinamen ohne Leerzeichen, zum Beispiel
  `coastal-light-01.jpg`
- alle Bilder eines Shootings mit demselben Dateipräfix benennen

Originaldateien außerhalb dieses Repositories sicher aufbewahren. Dieser Ordner ist
keine Backup-Lösung.
