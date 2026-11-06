# Lancio

Tema ufficiale Riseact per i siti pubblici delle organizzazioni (`<slug>.riseact.site`
o dominio custom). Template Jinja2 + Tailwind, nessun framework JS, nessun bundler.

Slug della famiglia: `launch` (vedi `manifest.json`). La versione nel manifest è
quella che `riseact theme release` pubblica: va incrementata a ogni release.

- [Avvio rapido](#avvio-rapido)
- [Struttura del repository](#struttura-del-repository)
- [Come Riseact renderizza una pagina](#come-riseact-renderizza-una-pagina)
- [Il linguaggio dei template](#il-linguaggio-dei-template)
- [Anatomia di una sezione](#anatomia-di-una-sezione)
- [CSS](#css)
- [JavaScript](#javascript)
- [Convenzioni](#convenzioni)
- [Pubblicazione](#pubblicazione)
- [Test](#test)
- [Debito tecnico noto](#debito-tecnico-noto)

## Avvio rapido

```bash
yarn install
yarn watch                 # ricompila assets/main.css a ogni salvataggio
riseact auth login
riseact theme dev          # sincronizza questa cartella con il tema di sviluppo
```

`riseact theme dev` apre una **sessione**: un tema in un'organizzazione di sviluppo,
creato al primo avvio e riusato dopo, memorizzato in `.riseact/dev.json`. La
sincronizzazione è bidirezionale — le modifiche locali salgono al salvataggio, quelle
fatte nell'editor visuale scendono con un poll ogni ~2s. In caso di conflitto vince
la modifica più recente; se entrambi i lati sono cambiati mentre la CLI era spenta,
vince il server.

Due cose che sorprendono sempre:

- **Le cancellazioni non si sincronizzano all'avvio.** Un file rimosso da disco e un
  file che il server ha in più sono indistinguibili, quindi la CLI lo riscarica.
  Rimuovi una sezione da entrambi i lati, o mentre la CLI è in esecuzione.
- **Tailwind non conosce le classi che non hai ancora compilato.** Se aggiungi una
  classe e non gira `yarn watch`, la pagina non cambia e non c'è nessun errore.

## Struttura del repository

| Percorso | Cos'è |
|---|---|
| `manifest.json` | nome, slug, versione, autore della famiglia di temi |
| `layout/*.html` | il documento HTML completo. Riceve `content_for_header` e `content_for_layout` |
| `sections/*.html` | blocchi componibili, ognuno si autodescrive con una coda `{% schema %}` |
| `snippets/*.html` | frammenti inclusi con `{% include %}`. Niente schema, invisibili all'editor |
| `templates/*.json` | **composizione della pagina**: quali sezioni, in che ordine, con quali impostazioni |
| `templates/supporters/*.html` | pagine statiche non componibili (area sostenitore). La chiave del template è il percorso, quindi un file nuovo qui serve una rotta del core che lo renda |
| `config/settings_schema.json` | dichiara le impostazioni globali del tema |
| `config/settings_data.json` | i **valori** di quelle impostazioni, più le sezioni globali |
| `assets/*` | CSS, JS, font. Serviti su `/assets/<nome>` |
| `test/` | suite Playwright. Non committata, non caricata come asset |

I temi sono solo testo: non esiste supporto per asset binari, le immagini stanno in
`Media` e si scelgono con un `image_picker` nello schema.

### Chi possiede cosa

Alla piattaforma servono due categorie di file, e la distinzione decide chi vince a
ogni aggiornamento del tema:

```
config/settings_data.json  -> ORGANIZZAZIONE
templates/**/*.json        -> ORGANIZZAZIONE
tutto il resto             -> RELEASE
```

I file di release vengono **sostituiti** dall'aggiornamento. Quelli
dell'organizzazione vengono **migrati, mai sovrascritti**: le chiavi mancanti si
aggiungono con i valori della release, quelle esistenti restano come sono.

Nota che dentro `templates/` la discriminante è l'estensione: i `.json` sono
composizione di pagina e appartengono all'organizzazione, gli `.html` sono codice.

Conseguenza pratica: `config/settings_data.json` e `templates/*.json` in questo repo
sono **il sito di esempio di un'installazione nuova**, non la configurazione di un
cliente. Un cliente che ha già il tema non li riceverà mai più.

## Come Riseact renderizza una pagina

1. Sceglie il tema: `?__preview=<uuid>` se presente, altrimenti quello corrente
   dell'organizzazione. `?__draft=1` sovrappone anche la bozza dell'editor visuale.
2. Carica `config/settings_data.json` → `settings` (esposto ai template come `theme`)
   e `sections` (le sezioni globali dichiarate nei layout).
3. Carica `templates/<chiave>.json` → quale layout, quali sezioni, in che ordine.
4. Renderizza ogni sezione da `sections/<type>.html`, unendo i default dello schema
   con le impostazioni dell'organizzazione, e avvolge ognuna in
   `<div class="__theme_section">` perché l'editor visuale sappia dove si clicca.
5. Renderizza il layout passando la concatenazione come `content_for_layout`.

**Una sezione che solleva un'eccezione non rompe la pagina.** L'errore viene
iniettato nel markup: la pagina risponde 200 con `Error rendering section X` visibile
nel corpo. La suite `test/specs/smoke.spec.js` cerca esattamente quella stringa,
perché altrimenti nessuno se ne accorge.

## Il linguaggio dei template

**È Jinja2, non Liquid.** Chi arriva da Shopify sbaglia sistematicamente qui: la
sintassi si assomiglia ma la semantica no. Le chiamate a metodo esistono
(`form.non_field_errors()`), l'accesso per chiave esiste (`form.errors[nome]`),
`{% macro %}` esiste, i filtri sono quelli di Jinja.

Gira in un `SandboxedEnvironment`, quindi non tutti gli attributi Python sono
raggiungibili, ma per il resto è Jinja standard.

### Tag propri di Riseact

| Tag | Cosa fa |
|---|---|
| `{% schema %}…{% endschema %}` | coda di una sezione: JSON che ne dichiara impostazioni, blocchi e template compatibili |
| `{% section 'nome' %}` | renderizza `sections/nome.html` (usato nei layout per header, footer, cookie) |
| `{% style 'main.css' %}` | emette `<link rel="stylesheet" href="/assets/main.css">`, con il `?__preview=` giusto |
| `{% asset 'nome.js' %}` | emette `<script src="/assets/nome.js">`, con il `?__preview=` giusto |
| `{% nav item %}` | risolve l'URL di una voce di menu |

`{% style %}` e `{% asset %}` aggiungono da soli il parametro `__preview`: è l'unico
modo di caricare un asset che funzioni anche in anteprima. Non scrivere mai
`/assets/...` a mano.

### Filtri

Oltre a tutti i filtri Jinja standard, il motore ne aggiunge due:

- `format_money` — formatta un importo nella valuta dell'organizzazione
- `format_date` — formatta una data ISO `YYYY-MM-DD` in `DD/MM/YYYY`, per esempio il
  valore di un custom field di tipo `date`. Un valore vuoto o non valido rende stringa vuota

### L'autoescape è disattivato

Questa è la cosa più importante del documento.

**Ogni `{{ }}` di un template è HTML grezzo.** Il motore esegue Jinja con
`autoescape` off, perché i contenuti rich text (`campaign.content`,
`section.settings.content`) devono poter emettere markup. Non c'è nessuna protezione
automatica: un valore inserito da una persona e stampato senza filtro è una XSS.

Da qui la risposta alla domanda che tutti fanno: **`|e` è l'alias di `|escape`**, il
filtro Jinja che converte `< > & " '` nelle entità HTML. Non ha niente di specifico a
Riseact, è Jinja puro.

La regola del tema:

```jinja
{{ supporter.full_name|escape }}          {# dato inserito da qualcuno: sempre escape #}
{{ campaign.content }}                    {# rich text del back office: volutamente HTML #}
{{ campaign.goal|int }}                   {# numero: nessun rischio #}
```

Scrivi sempre `|escape` per esteso, mai `|e`: la forma breve è ambigua a colpo
d'occhio e sparisce nella lettura di una riga lunga. Nel tema non è più usata.

Dentro un attributo HTML `|escape` è comunque il filtro giusto, perché il tema usa
sempre le virgolette doppie. Dentro una stringa JavaScript non basta: lì il dato non
va messo affatto, si passa da un `data-` attribute (vedi [JavaScript](#javascript)).

### Variabili di contesto

Disponibili su ogni pagina:

| Variabile | Cosa contiene |
|---|---|
| `theme` | le impostazioni globali del tema, cioè `settings` di `settings_data.json` |
| `section` | le impostazioni della sezione corrente, e `section.blocks` / `section.block_order` |
| `organization` | l'organizzazione proprietaria del sito |
| `supporter` | il sostenitore loggato, o falsy |
| `supporter_urls` | `login`, `logout`, `dashboard`, `profile`, `donations`, `campaigns` |
| `csrf_token` | da mettere in ogni form POST come `csrfmiddlewaretoken` |
| `current_url` | URL assoluto della pagina, usato dai pulsanti di condivisione |
| `pages`, `campaigns`, `blogs`, `articles`, `menus`, `menuitems` | elenchi per costruire liste e menu |

Aggiunte dalla vista che serve la pagina:

| Variabile | Dove |
|---|---|
| `campaign` | `campaign`, `peer_campaign` |
| `checkout_campaign`, `checkout_campaign_url`, `checkout_supporter`, `checkout_donation`, `form`, `message_published` | `thankyou`, la thank you page dopo una donazione |
| `lead_campaign`, `lead_campaign_url`, `lead_supporter` | `lead_thankyou`, la thank you page dopo una lead |
| `peer_campaign`, `stats` | `peer_campaign`, `peer_campaign_form`, `templates/supporters/peer_campaign.html` |
| `peer_campaign_updated`, `peer_campaign_public_url`, `peer_campaign_update_url_v2` | pagina di gestione (`peer_campaign_form` servito su `.../update/v2/`) |
| `peer_campaign_updated`, `peer_campaign_public_url`, `peer_campaign_manage_url` | dettaglio campagna dell'area (`templates/supporters/peer_campaign.html`, servito su `/my/campaigns/<id>/`) |
| `form`, `custom_field_definitions`, `privacy_field_definitions`, `captcha`, `lead_form_success` | campagne di tipo lead |
| `profile` | area sostenitore |

### Thank you page: donazione e lead

Le due thank you page sono pagine distinte, ciascuna con le sue varianti
(`thankyou.<nome>.json`, `lead_thankyou.<nome>.json`) scelte per campagna dall'admin.

| | Donazione | Lead |
|---|---|---|
| Template | `thankyou` | `lead_thankyou` |
| URL | `/campaigns/<slug>/thankyou/<token checkout>` | `/campaigns/<slug>/thankyou/lead/<token>` |
| Anteprima | `.../thankyou/__preview__` | `.../thankyou/lead/__preview__` |
| Sostenitore | `checkout_supporter` | `lead_supporter`, stessi campi |

Il contesto è lo stesso con il prefisso `lead_` al posto di `checkout_`, meno quello
che una lead non ha: la donazione e il form del messaggio. Il token della lead è
firmato dal core e vale 12 mesi.

Il core manda alla thank you lead **solo se il tema ha `templates/lead_thankyou.json`**.
Senza, la pagina campagna si ricarica con `lead_form_success` e il lead box conferma
in linea: è il comportamento dei temi precedenti alla 0.7.0, e il ramo resta in
`snippets/campaign-lead-box.html` per i temi derivati da questo.

### Captcha

Le viste che proteggono un form mettono `captcha` in contesto. Sono tre e solo tre:
lead box, checkout, login sostenitore. I form dentro l'area sostenitore non lo
portano, e un tema che ci disegna un widget non protegge niente a spese del donatore.

Quando `captcha.enabled` è falso il tema non renderizza nulla. Altrimenti il dict
porta `challenge_url`, `script_url`, `worker_url`, `algorithm`, `i18n_url`,
`language`, `field_name`, `honeypot_field`. **Endpoint e percorsi degli asset si
leggono da lì, non si scrivono a mano**: il core può cambiarli.

Il tema deve anche renderizzare `form.non_field_errors()` da qualche parte: un
honeypot scattato è un errore di form, perché il campo da cui arriva è invisibile e un
errore attaccato a quel campo rifiuterebbe l'invio senza dirlo a nessuno.
L'implementazione di riferimento è in `snippets/campaign-lead-box.html`.

## Anatomia di una sezione

```jinja
<div class="container">
  {{ section.settings.title|escape }}
</div>

{# djlint:off #}
{% schema %}
{
  "name": "Rich text",
  "settings": [
    { "id": "title", "type": "text", "label": "Titolo", "default": "" }
  ],
  "blocks": [],
  "presets": { "settings": {}, "blocks": [] },
  "locales": {},
  "templates": ["homepage", "page", "article"]
}
{% endschema %}
```

- `{# djlint:off #}` prima dello schema è obbligatorio: senza, il formattatore
  reindenta il JSON e lo rompe.
- `settings` genera i campi nell'editor visuale. Tipi in uso nel tema: `text`,
  `richtext`, `checkbox`, `select`, `slider`, `color_picker`, `image_picker`,
  `menu_picker`, `campaign_picker`, `header`.
- In una sezione anche `header` vuole `id` e `label`, oltre a `content`: il core
  lo valida come ogni altro campo e senza quei due rifiuta l'intero file
  (`assetCreate ... validation errors for SectionSchema`). L'editor mostra solo
  `content`. In `config/settings_schema.json` invece bastano `type` e `content`.
- `blocks` sono elementi ripetibili. Si iterano con `section.block_order` (ordinati)
  oppure con `section.blocks.items()`. L'editor li riordina trascinandoli e li
  elenca solo con il `name` dello schema, non con il loro contenuto.
- I `*_picker` dentro un blocco vengono idratati come quelli della sezione:
  `block.settings.campaign` è già l'oggetto campagna, o `None` se è stata cancellata.
- Il tipo `paragraph` non è un testo informativo: l'editor lo mostra come un campo
  rich text da compilare. Anche `info` di un campo viene ignorato dall'editor, quindi
  le istruzioni per chi configura vanno qui, non nello schema.
- `presets` serve perché la sezione sia aggiungibile a una pagina dall'editor. Una
  sezione senza presets si può usare solo se un `templates/*.json` la nomina.
- `templates` limita in quali pagine la sezione compare. Le sezioni `main_*`
  dichiarano il proprio template e non vanno altrove; per quelle componibili
  l'elenco è ancora da verificare caso per caso, vedi il debito tecnico.
- `limit` fissa quante istanze può avere una pagina, per le sezioni principali è 1.

Lo schema viene validato al momento della release: un JSON non valido blocca la
pubblicazione. Non viene validato durante `theme dev`.

### Ordine delle campagne di un progetto

`main_project` (pagina del progetto) e `featured_project` (campagne del progetto in
home o in una pagina) mostrano le campagne con `snippets/project-campaigns-grid.html`:

1. prima le campagne dei blocchi `Campagna`, nell'ordine in cui sono trascinate;
2. poi tutte le altre del progetto, secondo l'impostazione *Ordina le altre campagne
   per*. `Predefinito` è l'ordine restituito dal core, cioè quello di prima della 0.7.0.

Un blocco che punta a una campagna non pubblicata, cancellata, uscita dal progetto o
di un altro progetto viene ignorato senza errori.

L'ordine sta nel tema, non nel core. Siccome `templates/project.json` è uno solo per
tutti i progetti, per dare a un progetto un ordine suo:

1. nell'editor del tema, dal selettore dei template, crea un nuovo template a partire
   da *Progetto* (diventa `templates/project.<nome>.json`);
2. nella sezione principale aggiungi i blocchi `Campagna` e ordinali;
3. nella scheda del progetto, in admin, scegli quel template nella card *Template*.

I progetti senza template personalizzato continuano a usare `project.json`. I template
creati così appartengono all'organizzazione: gli aggiornamenti del tema non li toccano.

Una campagna nuova che entra nel progetto non ha un blocco, quindi finisce dopo quelle
fissate finché qualcuno non la aggiunge.

## CSS

Un solo foglio di stile: `assets/tailwind.css` è la sorgente, `assets/main.css` è il
build. **Il build è committato**, perché è il file che viene caricato come asset del
tema: se lo dimentichi, in produzione va la versione precedente.

```bash
yarn build     # una volta
yarn watch     # in sviluppo
```

I colori primari arrivano dalle impostazioni del tema e sono esposti come custom
properties CSS su `:root` in `layout/theme.html`:

- `--primary-bg-color` — colore di sfondo primario (bottoni pieni)
- `--primary-fg-color` — colore del testo sopra il primario

Si usano attraverso le classi componente `btn-primary`, `btn-outline`, `btn-sm`,
`input`, `richtext`, definite in `assets/tailwind.css`. Se ti serve il colore diretto,
la sintassi Tailwind è `bg-[color:var(--primary-bg-color)]` /
`text-[var(--primary-fg-color)]`. **Non esistono altre variabili di colore**: ogni
`var(--qualcosa)` che non sia una delle due qui sopra rende la dichiarazione invalida
e l'elemento resta trasparente, senza errori da nessuna parte.

Nel tema c'è ancora del CSS scritto a mano dentro `<style>` di sezione. Tre regole se
devi toccarlo:

1. Preferisci sempre una utility Tailwind. Il `<style>` serve solo quando il valore
   viene da un'impostazione (`background-color: {{ section.settings.bg_color }}`).
2. **Ogni selettore va agganciato a una classe della sezione.** Un `<style>` di
   sezione finisce nel documento globale: `p { font-size: 1.2rem }` dentro
   `sections/cookie.html` cambia la dimensione di ogni paragrafo del sito.
3. Il CSS con interpolazione Jinja non va mai passato a un formattatore JS/CSS —
   spezza `{{ }}` in `{ { } }` e il template smette di funzionare senza dirlo.

## JavaScript

**Stato attuale: `assets/` non contiene nessun file JS.** Tutto il comportamento vive
in `<script>` sparsi in 8 fra sezioni e snippet, più 17 handler `onclick` inline. È il
problema principale del tema (vedi il debito tecnico) e la direzione è: codice
condiviso in `assets/theme.js`, caricato con `{% asset 'theme.js' %}`.

Nel frattempo, le regole che vale la pena rispettare in ogni script nuovo:

- **Niente handler inline.** `onclick="..."` non passa una Content Security Policy,
  non si testa, non si trova con una ricerca. Aggancia gli eventi con
  `addEventListener` su un `data-` attribute.
- **Aggancia sui `data-` attribute, non sugli `id`.** Uno snippet può essere incluso
  più volte nella stessa pagina — `campaign-lead-box.html` e `campaign-donate-box.html`
  lo sono sempre, colonna mobile e colonna desktop — e in quel caso gli `id` sono
  duplicati. `document.getElementById` restituisce il primo, che sulla vista sbagliata
  è quello nascosto.
- **Lo script di uno snippet incluso due volte viene eseguito due volte.** Rendi
  l'inizializzazione idempotente, o vincola la logica al form più vicino
  (`element.closest('form')`).
- **I dati dal template si passano con un `data-` attribute**, non interpolando Jinja
  dentro una stringa JavaScript. `|escape` protegge l'HTML, non il contesto JS.
- Niente `document.onkeydown = ...` e simili: assegnare la proprietà cancella
  l'handler di chiunque altro. `addEventListener`.
- Niente `console.log` nel codice che va in release.

## Convenzioni

**Lingua.** Il testo visibile è in italiano. I commenti sono misti oggi; per il nuovo
codice usa l'italiano nei commenti, coerente con il resto del prodotto.

**Commenti.** Un commento spiega *perché*, mai *cosa*. `{# relative z-40 mette
l'header davanti alla pagina #}` sopra `class="relative z-40"` non aggiunge niente;
`{# senza questo il menu utente finisce sotto il donate box, che è sticky #}` sì. Se
il commento riformula il codice, cancellalo.

Usa i commenti Jinja `{# … #}` e non `<!-- … -->`: i primi non arrivano al browser.

**Nomi.** File in `kebab-case` per gli snippet, `snake_case` per le sezioni (è la
chiave che l'editor usa). Attributi di aggancio JS con prefisso esplicito:
`data-lead-submit`, `data-custom-select`, `data-supporter-type-toggle`.

**Formattazione.** `djlint` con il profilo `jinja`, configurato in `.djlintrc`.

```bash
djlint . --reformat
```

Non passare **mai** questi file a Prettier o a un formattatore CSS/JS: non conoscono
Jinja e spezzano `{{ }}` e `{% %}` in modo silenzioso. È già successo — vedi
`layout/theme.html` nel debito tecnico.

**Segreti.** `riseact.yml` contiene un access token. È in `.gitignore` **e** in
`.riseactignore`: non deve né essere committato né finire caricato come asset del
tema. Lo stesso vale per `test/`, che contiene credenziali.

## Pubblicazione

```bash
riseact theme release
```

Pubblica una versione **immutabile**. Prima valida tutto: manifest presente e semver,
ogni file Jinja che compila, ogni `{% schema %}` che è JSON valido, e riporta tutti
gli errori insieme, non il primo. Poi rifiuta versioni duplicate, versioni più vecchie
dell'ultima, changelog vuoto.

Le versioni sono un sottoinsieme stretto di semver: esattamente tre componenti
numeriche, niente pre-release e niente build metadata. **Gli aggiornamenti vanno solo
avanti**: per tornare indietro si installa la versione vecchia come tema separato.

Il changelog si compone nell'editor e non esiste un flag per passarlo, quindi la
pubblicazione non può partire da CI. È voluto.

Prima di rilasciare: `yarn build`, versione in `manifest.json` incrementata, suite
e2e verde.

## Test

Suite Playwright in `test/`, eseguita contro l'anteprima live. La cartella è ignorata
sia da `.gitignore` sia da `.riseactignore`: non è committata e non viene caricata.

```bash
cd test
npx playwright test
npx playwright test --grep-invert @write    # sola lettura, non crea niente
```

Documentazione completa in `test/README.md` (cosa copre, fixture e loro limiti),
`test/AGENTS.md` (credenziali, come ottenere un token API) e `test/LOCAL.md` (come
girare contro un `riseact-core` locale, l'unico posto con custom field `select` e
`date` da testare).

Vale la pena conoscere due convenzioni della suite:

- i test taggati `@write` inviano davvero il form lead e creano Supporter reali;
- i bug trovati e non ancora corretti stanno in `specs/known-issues.spec.js` marcati
  `test.fail()`. La suite resta verde finché il bug c'è e diventa rossa il giorno in
  cui qualcuno lo sistema, che è il promemoria per cancellare la voce.

## Debito tecnico noto

Ordinato per impatto. Quello che è già stato corretto sta in fondo.

### Struttura

1. **Nessun asset JS.** Portare in `assets/theme.js` quello che è condiviso — modali,
   dropdown, toggle descrizione, chiusura con ESC — e caricarlo dal layout con
   `{% asset 'theme.js' %}`. Il resto resta accanto alla sua sezione, ma agganciato
   con `addEventListener`, non `onclick`. Sono 8 `<script>` inline e 16 handler
   `onclick` da riportare a casa.
2. **`snippets/campaign-donate-box.html:102` assegna `document.onkeydown`**, quindi
   cancella qualunque altro handler globale di tastiera. Diventa `addEventListener`
   quando il codice si sposta in `theme.js`.
3. **Lo snippet del donate box viene incluso due volte** (colonna mobile e colonna
   desktop) e il suo `<script>` viene quindi eseguito due volte: `openModal`,
   `closeModal` e `toggleDescription` sono ridefinite e l'handler ESC riassegnato.
   Innocuo oggi, ma è la stessa trappola che rende fragili gli `id` duplicati.
4. **`--primary-color` non esiste** ma è usata in `sections/banner.html:2`: la
   dichiarazione è invalida e l'elemento resta trasparente. È `--primary-bg-color`.
   Le due occorrenze in `sections/main_campaign.html` sono state corrette.

### Coerenza

5. **L'escaping è applicato a macchia di leopardo.** Il giro peer-to-peer
   (`peer_campaign_form.html`, `peer_campaign.html`, il blocco delle raccolte
   personali di `main_campaign.html`), `user-menu.html` e l'area sostenitore usano
   `|escape`; il resto del tema non escapa niente — compresi `comment.message` e
   `donation.message`, che sono testo scritto dai donatori. Con l'autoescape
   disattivato ognuno di quei punti è una XSS. Serve un passaggio completo.
6. **`"templates"` negli schema resta approssimativo.** `sections/cookie.html`
   dichiara `[""]`, e diverse sezioni componibili elencano `["article","homepage","page"]`
   senza che nessuno abbia verificato che sia l'elenco giusto.
7. **Indentazione mista**: 2 e 4 spazi, più un tab in `sections/header.html`.
   Da uniformare con `djlint --reformat` in un commit dedicato, che non tocchi altro.
8. **Commenti in due lingue** nello stesso file (`campaign-lead-box.html` alterna
   inglese e italiano). Scegliere l'italiano e allineare.
9. **`sections/cookie.html` calcola `preferences` e non lo usa**, e `setCookie()` non
   imposta nessun cookie: nasconde due elementi. Nomi da correggere.

### Corretto

- `layout/theme.html` — un formattatore JS passato sul file nel commit `3aea482`
  aveva spezzato `{{ theme.primary_fg_color }}` in `{ { … } }`. Le due custom
  property non venivano più emesse e ogni `btn-primary` del sito era senza colore.
- `sections/cookie.html` — il pulsante "Declina" non deselezionava niente
  (`!form.elements[i].name === "technical"` è sempre falso) e salvava il consenso
  com'era. Problema di conformità, non di stile.
- `sections/cookie.html` — `p`, `h2`, `hr`, `form input` e una regola `label` vuota
  erano selettori globali dentro il `<style>` della sezione: cambiavano la tipografia
  di tutto il sito a partire da 405px. Ora sono agganciati a `.cookie-banner`,
  `.cookie-preferences-modal` e `#cookiePreferencesForm`.
- `sections/contact_form.html` — il campo telefono usava `id` e `name` dell'email e
  ne sovrascriveva il valore; `required` era invertito, quindi il campo era
  obbligatorio proprio quando era `type="hidden"` e bloccava l'invio con un errore
  che il browser non riesce a mostrare. Ora i campi opzionali non vengono renderizzati
  affatto. Corretti anche il `for` delle label, `full_witdh` → `full_width` e la
  lettura di `data.error` invece di `data.errors`, che ringraziava anche quando il
  server aveva rifiutato il form.
- `sections/main_campaign.html` — rimosso il codice morto: `toggleDescription`
  duplicata da `campaign-donate-box.html` e un `DOMContentLoaded` che cercava
  `#show-all-btn`, che su quel template non esiste, con la condizione per giunta
  invertita.
- `"product"` rimosso da tutti gli schema: non è un template Riseact. `main_404`,
  `main_500`, `main_project` e `main_project_list` ora dichiarano il proprio.

## Licenza

Copyright (c) 2023-present Riseact. Vedi [LICENSE](/LICENSE.md).
