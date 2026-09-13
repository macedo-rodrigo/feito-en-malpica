# Fotos de Malpica

As fotos do pobo e do porto que se ven na portada. As que hai agora mesmo
**non son fotografías**: son ilustracións de recheo xeradas polo propio
proxecto (`npm run images:placeholders`) para poder ver o deseño montado.
Hai que substituílas por fotos de verdade.

| Ficheiro | Onde sae | Proporción | Tamaño |
| --- | --- | --- | --- |
| `hero.jpg` | Fondo da cabeceira da portada | 2:1, moi apaisada | 2400 × 1200 px |
| `porto.jpg` | Ao carón do texto sobre Malpica | 4:5, vertical | 1200 × 1500 px |
| `peirao.jpg` | Faixa ancha debaixo dese texto | 21:9, panorámica | 2000 × 860 px |

**Para cambialas abonda con poñer a foto nova co mesmo nome.** Non hai que
tocar código. O sitio encárgase de convertelas e de servir a cada pantalla o
tamaño que lle corresponde.

Ten en conta o recorte: o `hero.jpg` vese moi apaisado e con texto por
diante, así que funciona mellor unha foto con ceo ou mar baleiro na metade
esquerda. Se unha foto queda mal recortada, dise e axústase o encadre.

**Textos alternativos.** Cada foto leva unha descrición para quen non a ve, e
as dúas de abaixo levan tamén pé de foto. Están en `src/i18n/gl.json`,
`es.json` e `en.json`, nas claves `home.heroAlt` e `malpica.*`. Hai que
cambialos para que describan a foto nova.

**Podes deixar aquí máis fotos das que se usan.** Non molestan: só acaban no
sitio publicado as que algunha páxina importe. Se hai unha que che gusta para
algún sitio, dise e búscaselle acomodo.

**Dereitos.** Usa fotos túas ou de quen che dea permiso. Se collas algunha de
internet, comproba a licenza antes: en Wikimedia Commons hai fotos de Malpica
con licenza libre, pero case todas obrigan a citar o autor dun xeito concreto.
