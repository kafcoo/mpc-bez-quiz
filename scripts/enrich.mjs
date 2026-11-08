import fs from "node:fs";
const qs = JSON.parse(fs.readFileSync("src/data/extracted.json"));
for (const [n, prefix] of [
  [11, "osobou schopnou vyhodnotit možná rizika"],
  [19, "bezpečnost a zdraví osob"],
  [33, "pomůcek"],
  [35, "napětím"],
  [39, "s pravou zdířkou"],
]) {
  qs[n - 2].options[2].text += " " + prefix;
  qs[n - 1].question = qs[n - 1].question.slice(prefix.length + 1);
}
// Manually assessed statements, matched by text rather than their position in the PDF.
const expectedStatements = {
  1: "v případě poruchy zařízení",
  2: "žlutá",
  3: "červená",
  4: "zelená",
  5: "nepředstavuje žádné nebo jen minimální nebezpečí při správném užívání",
  6: "ochrana malým napětím",
  8: "TN",
  9: "musí být odpojena, nejsou-li upravena pro přemisťování pod napětím",
  10: "musí být bez zbytečného odkladu odpojeny a zajištěny",
  11: "230/400 V",
  12: "vždy před použitím",
  13: "pro samostatnou činnost",
  14: "do 50 Vac, 120 Vdc",
  15: "10 mm2 Cu, 16 mm2 Al",
  16: "ano",
  17: "osoby poučené podle pokynů",
  18: "nevyhovuje požadavkům na bezpečný výrobek",
  20: "mezi živými části a zemí musí být základní izolace",
  22: "koordinaci způsobu uzemnění sítě a charakteristik ochranných přístrojů",
  23: "může být i holý a nemusí být veden ve společné trase s krajními vodiči",
  24: "smí, pod dozorem osoby znalé",
  25: "s dohledem osoby znalé",
  26: "samostatně",
  27: "U, V, W",
  28: "nesmí použít",
  29: "pracovník používá nástrojů a může přijít do styku s živými částmi",
  32: "přímo nebo předepsanými pracovními pomůckami za současného použití předepsaných ochranných pomůcek",
  33: "pro kterou jsou dány nejnutnější pokyny",
  34: "osoba znalá samostatně i ve vzdálenosti menší než 20 cm od živých částí pod napětím",
  35: "jej nesmí vykonat",
  36: "zahrnuje proceduru obdobnou jako při výchozí revizi a navíc má odhalit odchylky a závady zapříčiňující zvýšené riziko",
  38: "vždy s ochranným vodičem, se zástrčkou i zásuvkou vybavenými ochranným kontaktem",
  39: "stupeň ochrany osob před dotykem nebezpečných částí uvnitř zařízení",
  40: "přesvědčit se o jejich řádném stavu",
  41: "oddělovacím transformátorem",
  42: "pracující",
  43: "samostatná izolace používaná navíc k izolaci základní",
  44: "modrého kruhu s bílým piktogramem přikázané činnosti",
  45: "M",
  46: "ochranu proti stříkající vodě",
  47: "PE",
  48: "nařízeních vlády",
  49: "směrnice (direktivy) Evropských společenství",
  50: "nesmí být odpojován ani spínán",
  51: "nesmějí připojovat na nulový vodič",
  52: "musí být nezáměnné s obvody jiných napětí",
  53: "světle modrá",
  54: "kombinace barev zelená/žlutá",
  55: "kombinace barev zelená/žlutá po celé délce a na koncích světle modrá",
  56: "černá, hnědá, šedá",
  57: "prohlídku, zkoušení a vypracování zprávy",
  58: "žlutého černě orámovaného trojúhelníka",
  61: "bílého červeně orámovaného kruhu",
};
const explanations = [
  "Ochrana při poruše odpojí obvod v předepsané době, aby se omezilo nebezpečné dotykové napětí.",
  "Žlutá signalizace upozorňuje na abnormální stav vyžadující pozornost.",
  "Červená signalizuje nebezpečí nebo nouzový stav vyžadující bezprostřední zásah.",
  "Zelená signalizuje normální, bezpečný stav.",
  "Bezpečnost výrobku připouští minimální riziko slučitelné s jeho použitím; nejde o absolutní nulové riziko.",
  "SELV i PELV jsou ochranná opatření využívající malé napětí a ochranné oddělení.",
  "Formulace zaměňuje základní ochranu a ochranu při poruše. Doplňující pospojování omezuje rozdíly potenciálů; žádná možnost není bez výhrady.",
  "První písmeno T znamená přímé uzemnění bodu zdroje. Z uvedených možností tomu odpovídá TN, ale stejný znak má i síť TT.",
  "Přemisťování pod napětím je přípustné jen u zařízení k tomu konstrukčně určeného.",
  "Bezprostřední ohrožení vyžaduje odpojení a zajištění proti opětovnému zapnutí.",
  "V běžné síti nn je 230 V mezi fází a středním vodičem a 400 V mezi fázemi.",
  "Uživatel před použitím kontroluje zejména viditelná poškození; kontrola nenahrazuje revizi.",
  "§ 6 NV 194/2022 Sb. upravuje elektrotechnika pro samostatnou činnost v rozsahu jeho odborné způsobilosti.",
  "Obvyklá horní mez malého napětí je 50 V AC nebo 120 V DC; konkrétní prostředí může vyžadovat nižší hodnoty.",
  "PEN současně plní ochrannou i střední funkci; jeho mechanická spolehlivost vyžaduje nejméně 10 mm² Cu nebo 16 mm² Al.",
  "PELV dovoluje uzemnění; SELV je od země odděleno.",
  "Osoba poučená může na zařízení nn bez napětí pracovat podle pokynů a v rozsahu svého poučení.",
  "Nebezpečný výrobek nesplňuje požadavky na bezpečný výrobek. Samotná existence minimálního rizika ještě neznamená nebezpečný výrobek.",
  "Lhůty revizí závisí na konkrétním spotřebiči, způsobu připojení, použití a předpisech. Obecné znění nedovoluje jednoznačné určení.",
  "U SELV se vyžaduje ochranné oddělení od jiných obvodů a základní izolace mezi živými částmi a zemí; živé části se úmyslně neuzemňují.",
  "Hodnota závisí na konkrétní soustavě, podmínkách a použité normě; bez kontextu nelze určit univerzální limit.",
  "Odpojení musí odpovídat soustavě uzemnění a vypínacím charakteristikám ochranného přístroje.",
  "PE může být holý a samostatně vedený, pokud splní podmínky pro kontinuitu, ochranu a impedanci poruchové smyčky.",
  "U vn je pro práci poučené osoby v blízkosti nekrytých živých částí požadován dozor osoby znalé.",
  "Poučená osoba při takové práci nn potřebuje dohled osoby znalé; konkrétní podmínky určí pracovní postup.",
  "Znalá osoba může v rozsahu své způsobilosti pracovat samostatně při dodržení bezpečných pracovních postupů.",
  "Svorky fázových vinutí elektrických strojů se označují U, V a W.",
  "Plynové potrubí nesmí sloužit jako ochranný vodič; jeho pospojování je jiná funkce.",
  "Z uvedených možností práci vystihuje používání nástrojů s možností kontaktu se živými částmi; přesná definice je širší.",
  "Přípustnost práce pod napětím závisí na metodě, prostředí, kvalifikaci a pracovním postupu; kategorickou odpověď ověřte s vyučujícím.",
  "Otázka používá starší kvalifikační pojmy a nerozlišuje organizaci práce; ověřte požadovanou odpověď s vyučujícím.",
  "Práce pod napětím vyžaduje odpovídající pracovní i ochranné pomůcky podle použité metody.",
  "Práce podle pokynů má určeny nejnutnější pokyny; liší se od trvalého dohledu a dozoru.",
  "Znalá osoba může pracovat v blízkosti živých částí nn podle bezpečného pracovního postupu; uvedená vzdálenost sama o sobě neopravňuje k dotyku.",
  "Pokyn odporující bezpečnostním předpisům nesmí pracovník vykonat ani na písemný příkaz.",
  "Pravidelná revize posuzuje bezpečnost a odhaluje závady vzniklé používáním a stárnutím instalace.",
  "Limity dotykového proudu závisejí na druhu ochrany, normě a průběhu proudu. Bez přesného normativního kontextu ponecháno k revizi.",
  "Běžný prodlužovací přívod pro zásuvkový rozvod zachovává ochranný vodič i ochranné kontakty. PE se nespojuje s pracovním kontaktem v zásuvce.",
  "První číslice IP vyjadřuje ochranu před přístupem k nebezpečným částem a vniknutím pevných těles; druhá se týká vody.",
  "Před použitím je třeba zkontrolovat stav a použitelnost ochranných pomůcek.",
  "Oddělovací transformátor zajišťuje ochranné elektrické oddělení; autotransformátor oddělení nezajišťuje.",
  "Při práci podle pokynů odpovídá za jejich dodržení pracující osoba.",
  "Přídavná izolace je nezávislá na základní izolaci a doplňuje ji pro případ poruchy.",
  "Příkazová značka je modrý kruh s bílým piktogramem požadované činnosti.",
  "Střední vodič stejnosměrné soustavy nese označení M.",
  "IP X4 znamená ochranu proti vodě stříkající ze všech směrů; X neudává stupeň ochrany proti pevným tělesům.",
  "PE označuje ochranný vodič a jeho svorku.",
  "Konkrétní technické požadavky na stanovené výrobky stanovují příslušná prováděcí nařízení vlády.",
  "Směrnice EU se transponují do vnitrostátních předpisů, zatímco nařízení EU jsou přímo použitelná.",
  "Přerušení PEN by současně přerušilo ochrannou funkci; PEN se nesmí spínat ani samostatně jistit.",
  "V TT jsou neživé části spojeny s místním uzemněním, nikoli s nulovým vodičem zdroje.",
  "Nezáměnnost brání připojení obvodu malého napětí k vyššímu napětí.",
  "Střední (nulový) vodič N je označen světle modrou barvou.",
  "Ochrannému vodiči PE přísluší zelenožlutá kombinace.",
  "PEN je při tomto způsobu označení zelenožlutý po délce s doplňkovým světle modrým označením na koncích.",
  "Pro fáze jsou vyhrazeny hnědá, černá a šedá; světle modrá je určena pro N.",
  "Výchozí revize zahrnuje prohlídku, zkoušení a dokumentování výsledků revizní zprávou.",
  "Výstraha má žluté pole a černý okraj ve tvaru trojúhelníka.",
  "Otázka neuvádí normu, druh prostředí ani dobu odpojení. Uvedené limity nelze bezpečně zobecnit; ověřte původní testový klíč.",
  "Znění závisí na starší definici práce bez napětí a požadavcích na kryt. Správný pracovní postup zahrnuje také zajištění a ověření beznapěťového stavu.",
  "Zákazová značka je kruhová, bílá s červeným okrajem a obvykle červeným šikmým pruhem.",
  "Povinnost zaměstnavatele i vyhodnocení rizik jsou relevantní. Rozsah a lhůty závisejí také na právních a provozních požadavcích; otázka je nejednoznačná.",
];
const review = new Set([7, 19, 21, 30, 31, 37, 59, 60, 62]);
const verified = new Set([
  2, 3, 4, 6, 11, 15, 16, 27, 28, 39, 43, 44, 45, 46, 47, 50, 51, 52, 53, 54,
  55, 56, 57, 58, 61,
]);
for (const q of qs) {
  let n = q.originalNumber;
  const selected = q.options.find((o) => o.text === expectedStatements[n]);
  if (!review.has(n) && !selected)
    throw Error(`Statement missing for question ${n}`);
  q.correctAnswerId = review.has(n) ? null : selected.id;
  q.explanation = explanations[n - 1];
  q.verificationStatus = review.has(n)
    ? "needs_review"
    : verified.has(n)
      ? "verified"
      : "provisional";
  q.category = [2, 3, 4, 44, 58, 61].includes(n)
    ? "Značení a signalizace"
    : [
          5, 13, 17, 18, 24, 25, 26, 29, 30, 31, 32, 33, 34, 35, 42, 48, 49, 60,
          62,
        ].includes(n)
      ? "Práce a předpisy"
      : [12, 19, 36, 40, 57].includes(n)
        ? "Kontroly a revize"
        : [
              8, 11, 15, 21, 23, 27, 28, 38, 45, 47, 50, 51, 53, 54, 55, 56,
            ].includes(n)
          ? "Sítě a vodiče"
          : "Ochrana před úrazem";
  q.note = review.has(n)
    ? "Bez oficiálního klíče. Tato otázka se nehodnotí, dokud lokálně nedoplníte ověřenou odpověď."
    : q.verificationStatus === "provisional"
      ? "Pracovní návrh odpovědi podle významu otázky. Nejde o oficiální klíč; ověřte s vyučujícím."
      : "Odborně posouzený základní princip, nikoli oficiální testový klíč.";
  if ([5, 13, 17, 18, 24, 25, 26, 29, 31, 34, 48, 49, 60, 62].includes(n))
    q.note +=
      " Původní znění z roku 2022; aktuální právní a normativní stav nebyl nezávisle ověřen.";
}
fs.writeFileSync("src/data/questions.json", JSON.stringify(qs, null, 2));
console.log(
  `${qs.length} otázek, ${verified.size} posouzených, ${review.size} k revizi`,
);
