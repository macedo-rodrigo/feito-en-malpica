# O selo de Feito en Malpica

O logo é un selo circular monocromo: caligrafía manuscrita ("feito en" /
"Malpica") e o perfil das Illas Sisargas no centro.

## Ficheiros

| Ficheiro | Para que é | Tamaño mínimo |
| --- | --- | --- |
| `src/assets/brand/seal.svg` | Selo completo. Pé de páxina, páxina "O proxecto", material impreso. | 72 px |
| `src/assets/brand/seal-compact.svg` | Mesma arte co trazo engrosado, para a cabeceira. | 40 px |
| `src/assets/brand/mark.svg` | Só o aro e as illas. Favicon e iconas pequenas. | 16 px |
| `public/favicon.svg` | Copia de `mark.svg` co tamaño intrínseco posto. Xérase soa. | — |
| `brand/source/logo-original.jpeg` | Orixinal. **Non se usa na web.** | — |

Os tres SVG comparten o mesmo espazo de coordenadas (`viewBox="0 0 512 512"`)
e están pintados con `fill="currentColor"`, así que collen a cor do texto que
os rodea: negro sobre fondo claro, branco sobre fondo escuro.

## Como se fixeron

`npm run brand:trace` vectoriza `brand/source/logo-original.jpeg` con potrace.
O orixinal é un JPEG de 300 px con fondo branco opaco e artefactos de
compresión, así que **non se pode usar directamente**: o script límpao,
binarízao e traza os contornos.

`seal-compact.svg` sae da mesma arte, dilatando o trazo antes de trazalo, para
que non se esfarele arredor dos 48 px.

`mark.svg` **non é un trazado**: está debuxado a man e vai versionado. No
orixinal o aro mide 9 unidades de 512, que a 32 px son 0,57 px — desaparece
fágase o que se faga, e a caligrafía non se le por debaixo duns 64 px. Así que
esa variante garda só o que sobrevive — o aro e as Sisargas — redebuxado con
peso, coas proporcións medidas sobre o selo trazado (as illas ocupan o 82 % do
ancho do aro e van centradas).

`brand/preview/` leva probas de cada variante rasterizada ao tamaño real ao que
se usa, para poder ver se algún cambio a rompe. Non se versiona.

## Regras de uso

**Aire arredor.** Como mínimo o 20 % do diámetro do selo, libre por todos os
lados. É a regra que máis fácil se rompe ao meter o logo nunha barra estreita.

**Cor.** Só negro tinta (`--ink`) sobre fondo claro, ou branco espuma
(`--foam`) sobre fondo escuro. O selo é monocromo a propósito: **non se lle
saca paleta** nin se colorea co laranxa boia.

**Non facer:** rotalo, deformalo, poñerlle sombra, meterlle degradados,
recortar o aro, cambiarlle a tipografía nin poñelo sobre unha foto sen un
fondo sólido detrás.

**Tipografía.** O trazo manuscrito marca o ton do sitio: acompáñase cunha
serif con carácter (Fraunces nos titulares), nunca cunha sans xeométrica
corporativa.

## Se algún día aparece o orixinal vectorial

Estes SVG son un trazado do JPEG, non a arte orixinal. Se aparece o ficheiro
vectorial de quen o debuxou, substitúe `seal.svg` e `seal-compact.svg` por el
(normalizado ao mesmo `viewBox` de 512 e con `fill="currentColor"`) e revisa
se `mark.svg` segue cadrando coas proporcións novas.
