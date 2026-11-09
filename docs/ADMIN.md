# O editor (`/admin`)

Un panel para dar de alta artesáns e cambiar os textos das páxinas sen tocar
código nin abrir o proxecto.

## Como funciona, en dúas liñas

Non hai base de datos nin servidor. Cando se garda no editor, **faise un
cambio no repositorio de GitHub**, e o servidor reconstrúe o sitio a partir
del. Pasa un ou dous minutos entre darlle a gardar e velo publicado.

Iso ten dúas consecuencias que convén saber de antemán:

- **Quen edite precisa unha conta de GitHub con acceso ao repositorio.** Ese é
  o control de acceso, e é o que fai que todo isto saia de balde.
- **Non é instantáneo.** Gárdase, e ao cabo dun par de minutos vese na web.

A interface do editor sae **no idioma do navegador**. Quen navegue en castelán
veraa en castelán. Non hai tradución ao galego río arriba, así que eses
navegadores veránaa en inglés; pódese cambiar a man dentro do editor, en
*Settings*.

---

## Probalo agora mesmo, sen configurar nada

```bash
npm run admin
```

Ábrese `http://localhost:4322/admin/`. Preme en **«Traballar cun repositorio
local»** e escolle a carpeta do proxecto cando o pida. Non hai login: edita os
ficheiros deste ordenador directamente. É a mellor maneira de ver como queda o
panel antes de darllo a ninguén.

Os cambios quedan no teu disco como calquera outra edición: despois hai que
facer `git commit` e `git push` como sempre.

### Por que non `npm run dev`

O editor **non se abre co servidor de desenvolvemento**, e é a propósito. Ese
servidor recarga a páxina cada vez que cambia un ficheiro; como o editor
escribe ficheiros, pode recargarse a si mesmo a medio gardar e deixar o
contido truncado. O propio Sveltia avisa diso.

Por iso `npm run admin` usa un servidor estático aparte
(`scripts/serve-admin.mjs`), sen vixilancia de ficheiros. En produción non
fai falla nada disto: o servidor do sitio serve `public/admin/` igual e non
hai nada que recargue a páxina soa.

Como consecuencia, `http://localhost:4321/admin/` (o porto do `npm run dev`)
dá un 404. Non está roto: é que o editor non se serve por aí.

---

## Poñelo en marcha para que entre outra xente

Para que alguén poida editar desde a súa casa fai falla que GitHub o deixe
entrar. Hai dous camiños.

### Camiño curto: token persoal

Serve para probar hoxe mesmo, sen desplegar nada.

1. En GitHub: *Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token*.
2. Dálle acceso **só a este repositorio**, con permiso de **Contents:
   Read and write**.
3. En `/admin`, preme **«Entrar usando token de acceso»** e pégao.

Rápido, pero cada persoa ten que crear o seu token e gardalo nun sitio seguro.
Para alguén que non é técnico é un paso incómodo.

### Camiño recomendado: entrar con GitHub

Un botón de «Entrar con GitHub» e xa está. Fai falla montar unha vez un
servizo de login, que é gratuíto. Lévase uns dez minutos.

1. **Crear unha aplicación OAuth en GitHub.**
   *Settings → Developer settings → OAuth Apps → New OAuth App*.
   - *Application name*: `Feito en Malpica — editor`
   - *Homepage URL*: o enderezo do sitio
   - *Authorization callback URL*: `https://<o-teu-worker>.workers.dev/callback`
     (aínda non existe; vólvese aquí a corrixilo no paso 3)

   Garda o **Client ID** e xera un **Client Secret**.

2. **Desplegar o servizo de login** en Cloudflare Workers, que ten plan
   gratuíto. O proxecto é
   [`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth)
   e o seu README leva un botón de *Deploy to Cloudflare*.

   Configúranse tres variables no worker:
   - `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`, os do paso 1
   - `ALLOWED_DOMAINS`, co dominio do sitio

3. **Volver á aplicación OAuth** e poñer o enderezo real do worker no
   *callback URL*.

4. **Apuntar o editor ao worker.** En `public/admin/config.yml`:

   ```yaml
   backend:
     name: github
     repo: macedo-rodrigo/feito-en-malpica
     branch: main
     base_url: https://o-teu-worker.workers.dev
   ```

5. **Dar acceso á xente**: en GitHub, *Settings → Collaborators* do
   repositorio, convidalos con permiso de escritura.

---

## O que pode facer quen edita

| Sección | Que é |
| --- | --- |
| **Artesáns** | Dar de alta, cambiar ou borrar fichas. É o principal. |
| **Traducións ao castelán / inglés** | Só o texto. Os datos de contacto, as fotos e os prezos saen sempre da ficha en galego. |
| **Páxinas** | Os textos da portada, do listado, de «O proxecto» e de «Únete», nos tres idiomas. |

As fotos súbense desde o propio editor e gárdanse na carpeta do artesán.

## O que non pode facer

- **Engadir un oficio novo** á lista (cerámica, redes, cestaría…). Iso toca
  `src/content.config.ts` e mais os tres ficheiros de `src/i18n/`.
- **Cambiar o deseño**, o menú ou a estrutura das páxinas.
- **Saltarse as validacións.** O editor avisa en cada campo, pero a
  comprobación de verdade está no sitio: se algo obrigatorio falta, a
  publicación falla e o sitio queda como estaba. Non se rompe nada; queda
  sen actualizar ata arranxalo.

## Dúas cousas que convén lembrar

**Os comentarios pérdense.** Os ficheiros editados desde o panel reescríbense
enteiros, así que os comentarios que haxa no texto do ficheiro (coma o aviso
de «FICHA INCOMPLETA» de Nadia3D) desaparecen no primeiro gardado.

**O código da peza non se cambia nunca.** É o que une cada peza coa súa
tradución. Se se cambia, a tradución desa peza déixase de ver.
