# O panel de administración

Unha zona privada en `/admin` para dar de alta artesáns e cambiar os textos,
coas pantallas do propio sitio. Quen edita entra cun correo e un contrasinal;
non fai falla ter conta de GitHub nin saber nada de código.

## Como funciona

Non hai base de datos. Ao gardar, o panel escribe un cambio no repositorio de
GitHub e o servidor reconstrúe o sitio a partir del. **O cambio tarda un ou
dous minutos en verse publicado**, e o panel avísao ao gardar.

As páxinas públicas seguen sendo ficheiros estáticos, igual de rápidas. Só as
catro pantallas de `/admin` precisan servidor, e Netlify cóbreas no plan
gratuíto.

---

## Poñelo en marcha

Fan falla cinco variables no servidor. En Netlify están en
**Site configuration → Environment variables**.

### 1. O contrasinal

```bash
npm run admin:password -- "o-contrasinal-que-escollas"
```

Imprime dúas das variables, xa listas para pegar:

| Variable | Que é |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | O contrasinal cifrado. O contrasinal en claro non se garda en ningures. |
| `SESSION_SECRET` | Co que se asinan as sesións. Se se cambia, péchanse todas. |

### 2. O correo

| Variable | Exemplo |
| --- | --- |
| `ADMIN_EMAIL` | `nadia@exemplo.gal` |

É o correo co que se entra. Non se lle manda nada.

### 3. O acceso ao repositorio

O panel precisa permiso para escribir no repositorio. Faise cun token:

1. En GitHub: *Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token*.
2. **Repository access**: só este repositorio.
3. **Permissions → Contents: Read and write**. Nada máis.
4. Ponlle unha caducidade e apúntaa nalgures: cando venza, o panel deixa de
   gardar e hai que xerar outro.

| Variable | Valor |
| --- | --- |
| `GITHUB_TOKEN` | O token que acabas de xerar |
| `GITHUB_REPO` | `macedo-rodrigo/feito-en-malpica` |
| `GITHUB_BRANCH` | Opcional. Por defecto `main`. |

Este token é a chave do repositorio: quen o teña pode cambiar o sitio. Vive só
nas variables do servidor e nunca chega ao navegador.

### 4. Probar

Entra en `/admin`. Se falta algo, a páxina de entrada dirá **que** variable
falta en vez de dar un erro.

---

## Probalo nesta máquina

Crea un ficheiro `.env` na raíz (está ignorado por git):

```
ADMIN_EMAIL=probas@exemplo.gal
ADMIN_PASSWORD_HASH=...        # de npm run admin:password
SESSION_SECRET=...             # de npm run admin:password
GITHUB_REPO=macedo-rodrigo/feito-en-malpica
GITHUB_TOKEN=...               # un token de verdade, se queres probar a gardar
```

```bash
npm run dev
```

E abre `http://localhost:4321/admin/`. Todo funciona igual, agás que **gardar
escribe no repositorio de verdade**: se non queres iso, non poñas un token
válido e quedarás na pantalla de erro ao gardar.

---

## Que pode facer quen entra

| Pantalla | Que fai |
| --- | --- |
| **Panel** | A lista de artesáns, con botón para engadir outro. |
| **Ficha** | Nome, obradoiro, oficio, resumo, texto longo, foto de perfil, contacto, enderezo e as pezas con foto e prezo. |

As fotos súbense desde o formulario e gárdanse na carpeta do artesán. Déixao
baleiro no prezo e na web porá «Consultar».

### O que non se pode facer desde o panel

- **Borrar un artesán.** A propósito: é irreversible desde a web e fácil de
  premer sen querer. Dise e bórrase a man.
- **Traducir ao castelán ou ao inglés.** O que non estea traducido vese en
  galego, que é o comportamento previsto. As traducións fanse desde `/editor`
  ou a man.
- **Cambiar os textos das páxinas** (portada, «O proxecto», «Únete»). Tamén
  desde `/editor`.
- **Engadir un oficio novo** á lista. Iso toca código.

## `/editor`, a porta de atrás

En `/editor` segue estando o editor anterior (Sveltia), que entra con GitHub
e chega a todo: traducións, textos das páxinas e borrado. É a rede de
seguridade para quen si é técnico. Para usalo nesta máquina sen login:

```bash
npm run admin
```

---

## Seguridade: o que hai e o que non

**O que hai.** O contrasinal gárdase cifrado con scrypt, nunca en claro. As
sesións van nunha cookie asinada que o navegador non pode ler nin modificar,
e caducan ás doce horas. Un intento fallido tarda medio segundo a propósito,
para que non se poida probar unha lista de contrasinais a toda velocidade. A
resposta é a mesma tanto se falla o correo coma o contrasinal, para non dicir
cal das dúas metades acertaron.

**O que non hai.** Unha soa conta compartida: non se sabe quen fixo cada
cambio. Non hai bloqueo tras varios intentos fallidos — o servidor atende
cada petición nun proceso distinto e non hai onde levar a conta sen engadir
unha base de datos. A defensa é un contrasinal longo.

**Se se filtra o contrasinal**: xera outro con `npm run admin:password`,
cambia as dúas variables no servidor e volve despregar. Cambiar o
`SESSION_SECRET` pecha ademais todas as sesións abertas.

---

## Pendente de probar

Todo o camiño está verificado agás un paso: **gardar contra GitHub de
verdade** nunca se executou cun token real. O resto si: o login, a lista, o
formulario, as validacións, e que o ficheiro que xera o formulario constrúe
páxinas correctas nos tres idiomas.

A primeira vez que se garde desde o panel convén mirar o repositorio e
comprobar que apareceu o commit coa ficha e as fotos.
