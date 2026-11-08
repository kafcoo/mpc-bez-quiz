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

## Podklady a neoficiální klíč

Původní otázky a možnosti pocházejí z přiloženého PDF „Otázky KT - seznam 2022.pdf“. Dokument nemá pořadová čísla; ID 1–62 jsou přidělena podle pořadí v dokumentu. Text je zachován včetně původních formulací a překlepů; typografické mezery a zalomení jsou sjednoceny. Automatickou extrakci reprodukujete příkazy `node scripts/extract.mjs` a `node scripts/enrich.mjs`. Druhý skript opravuje pět přesahů třetích možností do další otázky a přidává samostatně zdůvodněný pracovní klíč.

**PDF neobsahuje oficiální klíč. Tato aplikace neslouží jako návod k práci na elektrickém zařízení.** Odpovědi nebyly potvrzeny vyučujícím a aktuální znění právních předpisů ani placených norem nebylo nezávisle ověřeno.

Databáze [questions.json](src/data/questions.json) rozlišuje:

- `verified`: 25 odpovědí posouzených podle základního odborného principu. Označení **neznamená oficiální klíč ani kontrolu aktuálnosti všech norem**.
- `provisional`: 28 pracovních návrhů; před uplatněním u zkoušky potvrďte s vyučujícím.
- `needs_review`: 9 nejednoznačných otázek bez klíče: 7, 19, 21, 30, 31, 37, 59, 60 a 62. Jejich odpovědi se uchovají, ale do hodnocení ani adaptivních intervalů se nezapočítávají. Ručně je označit lze.

Ve výchozím režimu se používají i pracovní návrhy s viditelným upozorněním. Volba „Pouze odborně posouzené odpovědi“ je vyřadí z nového testu. U každé otázky najdete zdůvodnění, stav i poznámku. Historické právní a kvalifikační formulace zůstaly původní; aplikace je nevydává za potvrzený aktuální stav.

Editor v Přehledu otázek mění pouze lokální klíč, vysvětlení, stav a poznámku. Nejde o serverového správce. Úpravy se nepřenášejí ostatním spolužákům. Sdílený klíč aktualizujte změnou databáze v repozitáři a novým nasazením. Rozpracované a dokončené testy mají vlastní snímek klíče, takže pozdější úprava nezmění historické hodnocení. Lokální změna se přenese exportem/importem postupu.

## Data a zálohy

Postup je v klíči `mpc-bez-v1`. Vymazání dat webu nebo anonymního profilu jej odstraní. Každý prohlížeč i doména mají vlastní postup; pro přenos použijte Nastavení → Exportovat/Importovat postup. Import nahrazuje dosavadní data až po potvrzení. Reset statistiky zachová klíč a nastavení. Při chybě ukládání se zobrazí upozornění; použijte export. Nečitelné původní uložené údaje se automaticky nepřepisují.

## Testy

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Jednotkové testy ověřují všech 62 záznamů, integritu odpovědí, opravy extrakce, promíchání, dvojklik, průchod testem, statistiky, opakování, nehodnocené otázky, uložení/obnovu, chyby úložiště a validaci importu. Prohlížečové testy ověřují skutečný průchod na desktopu a mobilu, simulaci, časový limit po obnovení, editor, zálohy a rozložení.

## GitHub Pages

Repozitář je určen pro účet `kafcoo`, název `mpc-bez-quiz`. V Settings → Pages nastavte Source na **GitHub Actions**. Workflow [pages.yml](.github/workflows/pages.yml) při každém pushi do `main` spustí jednotkové testy, produkční build a prohlížečové testy na Linuxu a následně publikuje `dist` přes GitHub Pages. Ručně lze nasazení spustit v Actions → Test and deploy to GitHub Pages → Run workflow.

Očekávaná adresa po úspěšném nasazení: https://kafcoo.github.io/mpc-bez-quiz/

Původní PDF, zadání a surová extrakce zůstávají pouze lokálně a nejsou publikovány. Repozitář obsahuje aplikaci s potřebnou databází otázek, testy a dokumentaci. Pro opakování extrakce vložte původní PDF do kořene své lokální kopie. Přenosné nástroje a přihlašovací stav v `.tools` jsou ignorovány a nepatří do repozitáře.
