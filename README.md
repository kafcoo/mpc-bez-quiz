# MPC-BEZ Quiz

Responzivní studijní aplikace pro přípravu na kontrolní test z Bezpečnosti v elektrotechnice. React, TypeScript, Vite, Tailwind CSS a Lucide. Bez backendu, registrace a externích služeb za běhu.

## Spuštění

Node.js 22.16 nebo novější (řada 22 LTS), npm:

```sh
npm ci
npm run dev
```

Aplikace běží na http://127.0.0.1:5173. Pro ověření produkční verze spusťte `npm run build` a `npm run preview`. Složku `dist` lze nahrát na libovolný statický hosting; relativní cesty fungují i v podadresáři GitHub Pages. Neotevírejte HTML dvojklikem přes file://.

## Funkce

- Kompletní test všech 62 otázek, výběr pevné skupiny, vlastního intervalu či tématu, problémové otázky a náhodný test (10, 20, 30 nebo všechny).
- Promíchané odpovědi se stabilními ID, volitelné pořadí otázek, okamžité nebo závěrečné vyhodnocení.
- Simulace s volitelným časovým limitem. Čas běží i po zavření stránky; po vypršení se test vyhodnotí. Nezodpovězené otázky se uvádějí zvlášť, úspěšnost je podíl správných mezi hodnocenými odpověďmi, nikoli pravidlo pro udělení zápočtu.
- Automatické ukládání odpovědí, postupu, historie, nastavení, rozpracovaného testu a lokálních úprav klíče do localStorage.
- Procvičování chyb, ručně označených a splatných otázek. Po chybě opakování za 10 minut, po správných odpovědích intervaly 1, 3, 7, 14 a 30 dní. Zvládnutí vyžaduje tři po sobě správné odpovědi a tři různé kalendářní dny (UTC).
- Přehled se všemi odpověďmi, vyhledáváním, filtry a editorem lokálního klíče.
- Výsledky včetně historie, grafu posledních 14 testů, skupin a nejčastějších chyb. Opakované odpovědi jsou odděleny od unikátních otázek.
- JSON export/import postupu s kontrolou verze a struktury, export kompletní aktuální databáze, reset s potvrzením.
- Tmavý a světlý režim (na telefonu v Nastavení), klávesy 1–3 a Enter, dialogy s uzavřeným cyklem fokusu a Escape, omezení animací podle systému.

## Databáze a kontrola klíče 10. 11. 2026

Primární databází zůstává [MPC-BEZ_otazky_klic.json](src/data/MPC-BEZ_otazky_klic.json). Znění všech 62 otázek a 186 možností i jejich ID zůstává přesně původní. PDF se znovu neextrahuje. Klíče, stavy a zdůvodnění byly revidovány proti veřejným primárním zdrojům: [úplná kontrola 62 položek](docs/kontrola-2026-11-10.md), [strojový záznam kontroly](src/data/review-2026-11-10.json).

- `verified`: **46** odpovědí s oporou pro výběr mezi původními možnostmi. Štítek „Doloženo zdrojem“ není oficiální klíč pedagoga ani potvrzení současné platnosti všech historických formulací.
- `provisional_ambiguous`: **9** podmíněných pracovních klíčů (8, 9, 19, 21, 23, 30, 31, 34, 48). Výhrada a zdroj jsou u každé otázky. Hodnotí se podle uvedeného ID.
- `needs_review`: **7** položek (7, 20, 37, 41, 59, 60, 62) bez správného či chybného hodnocení, bez vlivu na úspěšnost a opakovací intervaly.

**Návrhy změn 20 → ID 3 a 60 → ID 2 jsou uloženy, ale odporují citovaným materiálům VUT.** Proto mají stav needs_review. Pole `sourceSupportedAnswerId` u nich zachycuje ID 1 podporované zdroji; rozhraní ukazuje oba závěry odděleně. Otázka 20 zaměňuje oddělení od země s oddělením od jiných obvodů. U 60 starší skripta odlišují úmyslný dotyk (práce bez napětí) a nahodilý dotyk (práce v blízkosti napětí). Bez doložení konkrétního školního klíče se navržené změny nevydávají za ověřené odpovědi.

Možnosti v testech se vždy promíchají. Hodnocení porovnává `correctAnswerId` se stabilním ID volby, nikdy s pozicí. Stav needs_review má přednost i před neprázdným correctAnswerId. Kompletní test obsahuje 62 položek, z nichž 55 lze hodnotit podle použitého klíče; filtr needs_review vybere těchto 55.

Pole `keyRevision` identifikuje revizi. Nové testy používají aktuální databázi; historické a rozpracované testy zachovají svůj snímek a na odlišnou revizi upozorní. Statistiky se nepřepočítávají zpětně. Lokální úpravy zůstávají zachované s upozorněním, pokud vycházejí ze staré revize. U každé otázky lze v editoru obnovit aktuální výchozí klíč. Lokální změna není vydávána za kontrolu zdroji a nepřenáší se ostatním spolužákům.

Pozdější změnu sdíleného klíče proveďte v primárním JSONu: upravte `correctAnswerId`, `answerStatus`, `answerNote`, odkazy a `keyRevision`, doplňte záznam kontroly a znovu nasaďte aplikaci. Neměňte původní ID ani texty.

[questions.json](src/data/questions.json) slouží pouze pro témata a migraci starých dat. [Kontrola z 8. 11.](docs/kontrola-otazek.md), [původní dodané poznámky](docs/MPC-BEZ_otazky_klic.md) a staré extrakční skripty jsou historické podklady. Jejich starší počty a klíče nejsou aktuálními pravidly aplikace.

## Data a zálohy

Postup je nadále v klíči `mpc-bez-v1`, struktura má verzi 2. Původní verze 1 se při načtení či importu automaticky převede: ID otázek q1–q62 na bez-01–bez-62 a možnosti a/b/c na 1/2/3. Statistiky, označení obtížnosti, pořadí rozpracovaného testu, historie i lokální změny zůstanou zachované; staré výsledky se nepřepočítávají. Vymazání dat webu nebo anonymního profilu jej odstraní. Každý prohlížeč i doména mají vlastní postup; pro přenos použijte Nastavení → Exportovat/Importovat postup. Import nahrazuje dosavadní data až po potvrzení. Reset statistiky zachová klíč a nastavení. Při chybě ukládání se zobrazí upozornění; použijte export. Nečitelné původní uložené údaje se automaticky nepřepisují.

## Testy

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Jednotkové testy ověřují všech 62 záznamů, integritu odpovědí, přesnou shodu s dodaným JSONem, migraci starých dat, opravu klíče na libovolné ID, promíchání, dvojklik, průchod testem, statistiky, opakování, nehodnocené otázky, uložení/obnovu, chyby úložiště a validaci importu. Prohlížečové testy ověřují skutečný průchod na desktopu a mobilu, simulaci, časový limit po obnovení, editor, zálohy a rozložení.

## GitHub Pages

Repozitář je určen pro účet `kafcoo`, název `mpc-bez-quiz`. V Settings → Pages nastavte Source na **GitHub Actions**. Workflow [pages.yml](.github/workflows/pages.yml) při každém pushi do `main` spustí jednotkové testy, produkční build a prohlížečové testy na Linuxu a následně publikuje `dist` přes GitHub Pages. Ručně lze nasazení spustit v Actions → Test and deploy to GitHub Pages → Run workflow.

Očekávaná adresa po úspěšném nasazení: https://kafcoo.github.io/mpc-bez-quiz/

Původní PDF, zadání a surová extrakce zůstávají pouze lokálně a nejsou publikovány. Repozitář obsahuje aplikaci s potřebnou databází otázek, testy a dokumentaci. PDF není zdrojem pro nové sestavení aplikace. Přenosné nástroje a přihlašovací stav v `.tools` jsou ignorovány a nepatří do repozitáře.
