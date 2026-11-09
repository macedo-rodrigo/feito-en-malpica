# El panel de administración

Una zona privada en `/admin` para dar de alta artesanos y cambiar los textos,
con las pantallas del propio sitio. Quien edita entra con un correo y una
contraseña; no hace falta tener cuenta de GitHub ni saber nada de código.

## Cómo funciona

No hay base de datos. Al guardar, el panel escribe un cambio en el
repositorio de GitHub y el servidor reconstruye el sitio a partir de él. **El
cambio tarda uno o dos minutos en verse publicado**, y el panel lo avisa al
guardar.

Las páginas públicas siguen siendo ficheros estáticos, igual de rápidas. Solo
las cuatro pantallas de `/admin` necesitan servidor, y Netlify las cubre en el
plan gratuito.

---

## Ponerlo en marcha

Hacen falta cuatro variables en el servidor. Hay dos maneras de ponerlas.

### La rápida: rellenar un fichero y subirlo de una vez

```bash
cp .env.example .env          # y lo rellenas
npx netlify env:import .env   # las sube todas a Netlify
```

**El `.env` no se sube nunca al repositorio** y está ignorado por git a
propósito: lleva dentro el token de GitHub, que es la llave de escritura, y
este repositorio es público. El comando de arriba las manda a Netlify
directamente desde tu ordenador, sin pasar por GitHub.

Si prefieres hacerlo a mano, en Netlify están en
**Site configuration → Environment variables**.

### 1. Las cuentas

Una línea por persona. Genera cada una con:

```bash
npm run admin:password -- correo@ejemplo.com "la contraseña que elijas"
```

Imprime una línea con el correo y la contraseña cifrada. Todas juntas van en
`ADMIN_USERS`, **separadas por punto y coma y en una sola línea**, para que
se puedan pegar también en el panel web de Netlify sin que se rompan:

```
ADMIN_USERS="rodrigo@ejemplo.com a1b2c3:d4e5f6...;dario@ejemplo.com 9z8y7x:6w5v4u..."
```

Cada quien tiene **su propia contraseña**: no hay que compartir ninguna, y si
alguien deja el proyecto se borra su línea sin tocar la de los demás. Además,
el commit que genera cada guardado dice quién lo hizo.

La contraseña en claro no se guarda en ningún sitio. Si se pierde, se genera
otra línea y se sustituye.

### 2. El secreto de las sesiones

| Variable | Qué es |
| --- | --- |
| `SESSION_SECRET` | Con lo que se firman las sesiones. Lo imprime el mismo comando. Cambiarlo cierra todas las sesiones abiertas. |

### 3. El acceso al repositorio

El panel necesita permiso para escribir en el repositorio. Se hace con un
token:

1. En GitHub: *Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token*.
2. **Repository access**: solo este repositorio.
3. **Permissions → Contents: Read and write**. Nada más.
4. Ponle una caducidad y apúntala en algún sitio: cuando venza, el panel deja
   de guardar y hay que generar otro.

| Variable | Valor |
| --- | --- |
| `GITHUB_TOKEN` | El token que acabas de generar |
| `GITHUB_REPO` | `macedo-rodrigo/feito-en-malpica` |
| `GITHUB_BRANCH` | Opcional. Por defecto `main`. |

Este token es la llave del repositorio: quien lo tenga puede cambiar el sitio.
Vive solo en las variables del servidor y nunca llega al navegador.

### 4. Probar

Entra en `/admin`. Si falta algo, la página de entrada dirá **qué** variable
falta en vez de dar un error.

---

## Probarlo en esta máquina

Copia la plantilla y rellénala:

```bash
cp .env.example .env
```

```bash
npm run dev
```

Y abre `http://localhost:4321/admin/`. Todo funciona igual, salvo que
**guardar escribe en el repositorio de verdad**: si no quieres eso, no pongas
un token válido y te quedarás en la pantalla de error al guardar.

---

## Qué puede hacer quien entra

| Pantalla | Qué hace |
| --- | --- |
| **Panel** | La lista de artesanos, con botón para añadir otro. |
| **Ficha** | Nombre, taller, oficio, resumen, texto largo, foto de perfil, contacto, dirección y las piezas con foto y precio. |

Las fotos se suben desde el formulario y se guardan en la carpeta del
artesano. Deja el precio vacío y en la web pondrá «Consultar».

### Lo que no se puede hacer desde el panel

- **Borrar un artesano.** A propósito: es irreversible desde la web y fácil de
  pulsar sin querer. Se dice y se borra a mano.
- **Traducir al castellano o al inglés.** Lo que no esté traducido se ve en
  gallego, que es el comportamiento previsto. Las traducciones se hacen desde
  `/editor` o a mano.
- **Cambiar los textos de las páginas** (portada, «O proxecto», «Únete»).
  También desde `/editor`.
- **Añadir un oficio nuevo** a la lista. Eso toca código.

## `/editor`, la puerta de atrás

En `/editor` sigue estando el editor anterior (Sveltia), que entra con GitHub
y llega a todo: traducciones, textos de las páginas y borrado. Es la red de
seguridad para quien sí es técnico. Para usarlo en esta máquina sin login:

```bash
npm run admin
```

---

## Seguridad: lo que hay y lo que no

**Lo que hay.** La contraseña se guarda cifrada con scrypt, nunca en claro.
Las sesiones van en una cookie firmada que el navegador no puede leer ni
modificar, y caducan a las doce horas. Un intento fallido tarda medio segundo
a propósito, para que no se pueda probar una lista de contraseñas a toda
velocidad. La respuesta es la misma tanto si falla el correo como la
contraseña, para no decir cuál de las dos mitades acertaron.

Un correo que no existe tarda lo mismo en ser rechazado que uno que sí,
porque se verifica igualmente contra un hash señuelo. Sin eso, el login
estaría diciendo qué cuentas existen.

**Lo que no hay.** Bloqueo tras varios intentos fallidos: el servidor atiende
cada petición en un proceso distinto y no hay dónde llevar la cuenta sin
añadir una base de datos. La defensa es una contraseña larga.

**Si se filtra una contraseña**: genera otra línea con
`npm run admin:password`, sustituye la de esa persona en `ADMIN_USERS` y
vuelve a desplegar. Las demás cuentas no se tocan. Si quieres echar a alguien
de inmediato, cambia también el `SESSION_SECRET`: eso cierra todas las
sesiones abiertas.

---

## Pendiente de probar

Todo el camino está verificado salvo un paso: **guardar contra GitHub de
verdad** nunca se ha ejecutado con un token real. El resto sí: el login, la
lista, el formulario, las validaciones, y que el fichero que genera el
formulario construye páginas correctas en los tres idiomas.

La primera vez que se guarde desde el panel conviene mirar el repositorio y
comprobar que ha aparecido el commit con la ficha y las fotos.
