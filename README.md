# Feito en Malpica

Escaparate online dos artesáns de **Malpica de Bergantiños** (A Coruña, Costa
da Morte). Cada artesán ten a súa ficha coas súas pezas e os seus datos de
contacto.

**Aquí non se vende nada.** Non hai carriño, nin pagos, nin comisións: a
compravenda péchase directamente entre o comprador e o artesán, por teléfono,
WhatsApp ou correo.

---

## Arrancar o proxecto

Precísase **Node.js 20.3 ou superior** (ver [Nota sobre a versión de
Node](#nota-sobre-a-versión-de-node)).

```bash
npm install      # instalar dependencias (só a primeira vez)
npm run dev      # servidor de desenvolvemento en http://localhost:4321
npm run build    # xerar o sitio estático en dist/
npm run preview  # ver o resultado de build/ como se estivese publicado
```

O resultado de `npm run build` é HTML, CSS e imaxes: pódese subir tal cal a
Netlify, Vercel, GitHub Pages ou calquera servidor. Non hai backend nin base
de datos.

### Scripts auxiliares

```bash
npm run check                 # comproba tipos e contido
npm run check:contrast        # verifica o contraste da paleta contra WCAG AA
npm run brand:trace           # revectoriza o logo desde brand/source/
npm run fonts:sync            # copia as tipografías a public/fonts/
npm run images:placeholders   # xera imaxes de exemplo que falten
npm run shots                 # capturas de dist/ para revisar o deseño
```

---

## Engadir un artesán novo

Todo o contido vive en ficheiros de texto dentro do repositorio. Non fai falla
tocar código.

### 1. Crear a carpeta

Unha carpeta por artesán dentro de `src/content/artisans/`, co nome que queiras
que apareza no enderezo web (en minúsculas, sen acentos e con guións):

```
src/content/artisans/marisa-varela/
├── index.md                    ← os datos e o texto
├── perfil.jpg                  ← foto de perfil, proporción 4:5
└── pezas/
    ├── cesta-vimbio.jpg        ← unha foto por peza, cadrada (1:1)
    └── nasa-pequena.jpg
```

### 2. Escribir `index.md`

Copia o de outro artesán e cambia os datos. A parte de arriba (entre as liñas
`---`) son os datos; a de abaixo é o texto libre da ficha.

```yaml
---
name: Marisa Varela Souto          # nome e apelidos
workshop: Cestaría de Buño          # nome do obradoiro
craft: basketry                     # oficio, da lista de máis abaixo
featured: false                     # true = sae destacada na portada
order: 2                            # os números máis baixos saen primeiro
summary: >-                         # entre 20 e 200 caracteres
  Cestas de vimbio e nasas feitas a man en Buño, coma sempre.
photo:
  src: ./perfil.jpg
  alt: Marisa Varela tecendo unha cesta de vimbio na porta do obradoiro.
location:
  address: Rúa do Forno 3. 15111 Buño, Malpica de Bergantiños
  directions: Subindo desde a igrexa, á dereita.   # opcional
  mapUrl: https://www.openstreetmap.org/...        # opcional
contact:                            # abonda con un dos tres
  phone: "+34981000000"             # sempre con +34 e sen espazos
  whatsapp: "+34600000000"
  email: marisa@exemplo.gal
social:                             # opcional
  - network: instagram
    url: https://www.instagram.com/cestariadebuno/
    handle: "@cestariadebuno"
commissions: true                   # acepta encargos
shipping: false                     # fai envíos
pieces:
  - id: cesta-vimbio                # identificador único, non se cambia nunca
    image: ./pezas/cesta-vimbio.jpg
    alt: Cesta de vimbio de asa alta sobre unha mesa de madeira.
    title: Cesta de vimbio
    description: Cesta de compra de vimbio pelado, tecida en dous días.
    price: 45                       # en euros, ou `null` para "Consultar"
---

Aquí vai o texto longo da ficha, en parágrafos normais.
Pódense usar **negriñas** e listas.
```

**Oficios dispoñibles** (`craft`): `3d-printing`, `ceramics`, `nets`,
`basketry`, `jewellery`, `wood`, `preserves`, `textile`, `leather`.
Para engadir un oficio novo, hai que engadilo á lista `CRAFTS` de
`src/content.config.ts` e poñerlle nome nos tres ficheiros de
`src/i18n/` (a clave é `craft.<oficio>`).

### 3. As fotos

| Foto | Proporción | Tamaño recomendado |
| --- | --- | --- |
| Perfil | 4:5 (vertical) | 1000 × 1250 px |
| Peza | 1:1 (cadrada) | 1200 × 1200 px |

Non fai falla optimizalas: o sitio xéraas só en WebP e AVIF, en varios tamaños,
e cárgaas de forma diferida. Sobe a foto grande e xa está.

Se aínda non hai fotos reais, `npm run images:placeholders` crea imaxes de
recheo coas proporcións correctas (hai que engadir a ficha nova á lista de
`scripts/generate-placeholders.mjs`). **Nunca sobrescribe** unha imaxe que xa
exista, así que podes ir substituíndoas por fotos reais unha a unha.

### 4. Comprobar

```bash
npm run dev
```

Se falta algo obrigatorio — un `alt`, un teléfono mal escrito, un oficio que
non existe — o sitio **non arranca** e dille exactamente que ficheiro e que
campo fallan. Iso é a propósito: é mellor que falle aquí que publicar unha
ficha coxa.

---

## Idiomas

O sitio está en **galego** (idioma principal), **castelán** e **inglés**.

| Idioma | Enderezo |
| --- | --- |
| Galego | `/`, `/artesans/`, `/sobre/`, `/unete/` |
| Castelán | `/es/`, `/es/artesanos/`, `/es/sobre/`, `/es/unete/` |
| Inglés | `/en/`, `/en/makers/`, `/en/about/`, `/en/join/` |

### Como está organizado

**O galego é a fonte da verdade.** O ficheiro do artesán en
`src/content/artisans/` leva *todos* os datos: teléfono, correo, redes,
imaxes, prezos, oficio. Así un número de teléfono existe nun único sitio e
nunca pode quedar desactualizado nunha lingua e non noutra.

As traducións levan **só o texto que cambia**:

```
src/content/translations/es/marisa-varela.md    ← castelán
src/content/translations/en/marisa-varela.md    ← inglés
```

O que non estea nesas traducións **móstrase en galego**. Non pasa nada por
non traducir unha ficha: sae en galego e listo.

Os textos das páxinas (portada, o proxecto, únete) están en
`src/content/pages/<idioma>/`, un ficheiro por idioma e páxina.

As etiquetas da interface (botóns, menú, "Consultar", "Acepta encargos"…)
están en `src/i18n/gl.json`, `es.json` e `en.json`. Se falta unha clave nun
idioma, úsase a galega.

---

## Estrutura do proxecto

```
src/
├── assets/
│   └── brand/          logo en SVG (ver brand/README.md)
├── components/         pezas reutilizables da interface
├── content/
│   ├── artisans/       unha carpeta por artesán (datos + fotos)
│   ├── translations/   traducións das fichas ao castelán e inglés
│   └── pages/          textos das páxinas, por idioma
├── i18n/               idiomas, rutas traducidas e etiquetas
├── layouts/            armazón común das páxinas
├── lib/                utilidades (enlaces de contacto, formato de prezos)
├── pages/              unha carpeta por idioma; define os enderezos
├── styles/             CSS global e variables de deseño
└── views/              o contido de cada páxina, compartido polos 3 idiomas

public/                 ficheiros que se copian tal cal (favicon, fontes, og/)
scripts/                utilidades de desenvolvemento
brand/                  material de marca e o logo orixinal
tests/                  probas de extremo a extremo (Playwright)
```

`src/content.config.ts` define que campos leva cada ficha e cales son
obrigatorios.

Os ficheiros de `src/pages/` son só tres liñas cada un: cargan a vista
correspondente de `src/views/` pasándolle o idioma. Así as tres versións dunha
páxina non poden separarse na estrutura, só no texto que cargan.

---

## Deseño

Todo o sistema visual está en `src/styles/tokens.css`: cores, escala
tipográfica, espazos, sombras e tempos de animación. Cambiar un valor alí
cámbiao en todo o sitio.

- **Paleta**: azuis de mar profundo, gris granito, branco espuma e un laranxa
  de boia como único acento. Negro tinta para o texto e o selo.
- **Tipografía**: Fraunces nos titulares (co eixo óptico activo, que afina os
  remates nos tamaños grandes) e Public Sans no corpo. As dúas van no propio
  servidor: o sitio non fai ningunha petición a terceiros.
- **Contraste**: `npm run check:contrast` comproba cada parella de cor
  texto/fondo que o sitio usa realmente contra o mínimo AA de WCAG, lendo os
  valores de `tokens.css`. Se algunha baixa do limiar, sae con erro.

---

## Fotos de Malpica

A portada leva tres imaxes do lugar. Agora mesmo son ilustracións de recheo
xeradas polo propio proxecto: **hai que substituílas por fotografías reais**.

| Ficheiro | Onde sae | Proporción | Tamaño |
| --- | --- | --- | --- |
| `src/assets/malpica/hero.jpg` | Fondo da cabeceira | 2:1 | 2400 × 1200 px |
| `src/assets/malpica/porto.jpg` | Columna dereita do bloque "Malpica" | 4:5 | 1200 × 1500 px |
| `src/assets/malpica/peirao.jpg` | Faixa ancha baixo ese bloque | 21:9 | 2000 × 860 px |

Abonda con poñer a foto real co mesmo nome e a mesma proporción: non hai que
tocar código. O sitio encárgase de convertelas a WebP e AVIF nos tamaños que
fagan falla e de cargalas cando toque.

Os textos alternativos e os pés de foto están en `src/i18n/gl.json`,
`es.json` e `en.json`, nas claves `home.heroAlt` e `malpica.*`. Hai que
cambialos para que describan a foto nova: o texto alternativo é o que le quen
non ve a imaxe.

**Dereitos de imaxe:** usa fotos túas ou de quen che dea permiso por escrito.
Se collas algunha de internet, comproba a licenza antes; en Wikimedia Commons
hai imaxes de Malpica con licenzas libres, pero case todas obrigan a citar o
autor dunha maneira concreta.

---

## Publicar

Calquera servizo de sitios estáticos vale. A configuración é sempre a mesma:

- **Comando de build:** `npm run build`
- **Carpeta de publicación:** `dist`

Antes de publicar por primeira vez, cambia o dominio en `astro.config.mjs`:

```js
const SITE = 'https://feito-en-malpica.netlify.app';  // ← poñer o dominio real
```

Dese valor saen os enderezos canónicos, o `sitemap.xml` e as imaxes que se ven
ao compartir en redes sociais. É o único sitio onde hai que cambialo.

### Formulario de "Únete"

O formulario compón unha mensaxe de correo e ábrea no programa de correo de
quen escribe. Non hai servidor, non se garda nada e non hai spam que xestionar.

Se algún día se quere un formulario de verdade e o sitio está en Netlify,
abonda con engadirlle tres atributos ao `<form>` (`data-netlify="true"`,
`name="unete"` e un campo `<input type="hidden" name="form-name" value="unete">`)
e Netlify recolle os envíos por si só.

---

## Nota sobre a versión de Node

O proxecto está fixado en **Astro 5.18.2**, que é a última versión compatible
con Node 20.3. Coa versión de Node instalada agora mesmo (**20.11.1**) non se
pode subir máis: Astro 6 e 7 esixen Node 22.12 ou superior.

Recoméndase **actualizar a Node 22 LTS** e despois `npm install astro@latest`:

- Node 20 xa non recibe actualizacións de seguridade.
- `npm audit` marca vulnerabilidades de XSS en `astro <= 7.0.9`, corrixidas a
  partir de 7.0.10. Neste sitio non son alcanzables — é estático, non hai
  servidor en produción e todo o contido está no repositorio, non o escribe
  ninguén de fóra — pero é mellor non arrastralas.

A migración é pequena: este proxecto non usa ningunha das APIs que cambiaron.

---

## Datos de exemplo

A ficha de **Uxío Lema Vilariño / Capa a Capa** é un exemplo. O teléfono, o
WhatsApp, o correo e o Instagram son inventados e non pertencen a ninguén.
Hai que substituílos por datos reais antes de publicar.

## Privacidade

O sitio non ten cookies, nin analítica, nin formularios que garden nada, nin
recursos externos: as tipografías van no propio servidor e non se carga nada
de terceiros.
