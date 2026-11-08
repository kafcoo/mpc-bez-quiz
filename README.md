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

## Primární databáze a pracovní klíč

Primární databází je dodaný [MPC-BEZ_otazky_klic.json](src/data/MPC-BEZ_otazky_klic.json), uložený beze změny. [Doprovodné poznámky](docs/MPC-BEZ_otazky_klic.md) zachycují výhrady ke klíči. Všech 62 otázek a všech 186 možností se používá v přesném znění JSONu, včetně původních ID. PDF se znovu neextrahuje a build ani testy jej nepotřebují.

Aplikace respektuje pole `answerStatus`:

- `provisional`: 45 předběžných odpovědí.
- `provisional_ambiguous`: 16 předběžných nejednoznačných odpovědí s konkrétní výhradou v `answerNote`.
- `needs_review`: otázka 7. Nikdy se nehodnotí jako správná ani chybná, ani pokud někdo doplní neprázdné `correctAnswerId` bez změny stavu. Neovlivní úspěšnost, intervaly ani počet hodnocených pokusů.

Předběžné odpovědi se hodnotí podle dodaného `correctAnswerId`, s viditelným označením pracovního klíče. Nejde o oficiálně potvrzenou správnost. V dodané databázi má 61 položek klíč "1", otázka 7 má `null`. V testu se možnosti vždy náhodně promíchají; skórování porovnává stabilní ID a nespoléhá na pořadí ani na hodnotu "1".

Pozdější oprava sdíleného klíče znamená změnu `correctAnswerId`, `answerStatus` a `answerNote` ve výchozím JSONu a nové nasazení. Neměňte přitom ID ani původní texty. Editor v Přehledu otázek umožňuje opravu pro vlastní prohlížeč, včetně nejednoznačného stavu a obnovení výchozího klíče. Lokální změny jsou součástí exportu postupu; na spolužáky se automaticky nepřenášejí. Úprava se projeví v nových testech. Rozpracované a dokončené testy mají snímek klíče, aby se historická hodnocení nepřepisovala.

Soubor [questions.json](src/data/questions.json) uchovává předchozí katalog pouze pro témata a migraci dříve uložených dat. Jeho klíče ani stav ověření se nepoužívají jako výchozí hodnoty nových otázek. [Starší kontrola](docs/kontrola-otazek.md) a extrakční skripty jsou historické podklady; jejich odlišné hodnocení bylo nahrazeno dodanou JSON databází.

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
