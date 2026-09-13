# Fotos de Malpica

As fotos do pobo e do porto que se ven na portada.

| Ficheiro | Onde sae | Proporción | Tamaño |
| --- | --- | --- | --- |
| `hero.jpg` | Fondo da cabeceira da portada | 2:1 | 2400 × 1200 px |
| `porto.jpg` | Ao carón do texto sobre Malpica | 4:5 | 1200 × 1500 px |
| `peirao.jpg` | Faixa ancha debaixo dese texto | 21:9 | 2000 × 860 px |

## De onde saen

**Non son fotos do proxecto.** Están sacadas de Wikimedia Commons, son de
**JCNazza** e teñen licenza **CC BY 3.0**. Recortáronse ás proporcións de
arriba, nada máis: nin se retocaron nin se lles cambiou a cor.

- `hero.jpg` e `porto.jpg` saen de
  [Malpica — panoramio (1)](https://commons.wikimedia.org/wiki/File:Malpica_-_panoramio_(1).jpg)
- `peirao.jpg` sae de
  [Malpica — panoramio (3)](https://commons.wikimedia.org/wiki/File:Malpica_-_panoramio_(3).jpg)

A licenza CC BY obriga a citar o autor **onde se vexan as fotos**. Por iso hai
unha liña de créditos no pé de páxina de todo o sitio. Está en
`src/data/photo-credits.ts` e píntaa `src/components/Footer.astro`.

**Non quites esa liña mentres estas fotos sigan aquí.** Sen ela, o sitio
estaría a incumprir a licenza.

## Como cambialas por fotos propias

Pon a foto nova co mesmo nome e a mesma proporción. Non hai que tocar código:
o sitio encárgase de convertelas a WebP e AVIF e de servir a cada pantalla o
tamaño que lle corresponde.

Cando **todas** as fotos sexan propias, borra `src/data/photo-credits.ts` e o
bloque `.footer-photos` de `Footer.astro`: a liña de créditos xa non fai falla.
Se só cambias algunha, quita do ficheiro de créditos a entrada que sobre.

Ten en conta o encadre: o `hero.jpg` vese moi apaisado e leva o titular por
diante, na metade esquerda. Se unha foto queda mal recortada, dise e axústase.

## Textos alternativos

Cada foto leva unha descrición para quen non a ve, e as dúas de abaixo levan
tamén pé de foto. Están en `src/i18n/gl.json`, `es.json` e `en.json`, nas
claves `home.heroAlt` e `malpica.*`. Hai que cambialos ao cambiar as fotos.

## Se traes fotos doutro sitio

Usa fotos túas ou de quen che dea permiso. Se as collas de internet, comproba
a licenza antes e engade a entrada que corresponda a `photo-credits.ts`.
**Non valen as fotos de bancos de imaxes nin as que leven marca de auga**,
por moito que se vexan ben.
