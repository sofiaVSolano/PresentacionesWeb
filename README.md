# Sofia Valencia — Mi Universo Digital

Portafolio personal construido como una experiencia digital interactiva: editorial, cinematográfica y con 3D estratégico. No es un portfolio de plantilla — cada sección tiene su propio lenguaje visual y está conectada por scroll continuo.

## Arquitectura

Proyecto dividido en dos aplicaciones independientes que se comunican por HTTP:

```
portfolio/
├── Frontend/   React + TypeScript + Vite
└── Backend/    Python + FastAPI
```

El frontend es la experiencia completa (animaciones, 3D, audio). El backend solo expone los endpoints que realmente necesitan lógica de servidor (contacto, datos de proyectos).

## Tecnologías

**Frontend**
- React 19 + TypeScript + Vite
- GSAP + ScrollTrigger (animación ligada a scroll)
- Lenis (smooth scroll)
- Three.js + React Three Fiber + drei (3D: ADN, universo de proyectos)
- ESLint + Prettier

**Backend**
- FastAPI + Pydantic
- Uvicorn
- Pytest
- Ruff

## Estructura

```
Frontend/
├── src/
│   ├── components/   componentes reutilizables (cursor, nav, casino, etc.)
│   ├── sections/      cada sección del scroll (Hero, MiMente, MiADN, ...)
│   ├── animations/    hooks/utilidades de GSAP y ScrollTrigger
│   ├── three/          escenas y elementos 3D (R3F)
│   ├── hooks/           hooks compartidos
│   ├── services/        llamadas a la API del backend
│   ├── data/             información configurable (profile, skills, projects...)
│   ├── types/            tipos TypeScript compartidos
│   ├── assets/           assets importados por el bundler
│   └── styles/           tokens de color, tipografía, globals
├── public/assets/        lo que el sitio sirve al navegador
│   ├── character/        foto real y avatar recortados (sin fondo)
│   ├── transformation/   fotogramas del video de transformación (lg = escritorio, sm = móvil)
│   ├── projects/         imágenes de proyectos
│   ├── sounds/           efectos de sonido
│   ├── textures/         texturas para 3D
│   └── cv/               PDF del CV
├── source-assets/        material original — NO se publica ni entra en Docker
│   ├── fotos-originales/ foto y avatar con fondo
│   ├── video/            video original de la transformación
│   └── referencias/      imágenes de inspiración de diseño
└── scripts/
    └── extract_frames.py parte el video en fotogramas para el scroll

Backend/
└── app/
    ├── api/            router principal (agrega todas las rutas bajo /api)
    ├── routes/         endpoints HTTP (health, projects, contact)
    ├── services/       lógica de negocio
    ├── schemas/        modelos Pydantic (request/response)
    ├── models/         entidades de dominio (si se necesita persistencia)
    ├── repositories/   acceso a datos
    └── core/            configuración (settings, CORS)
```

## Instalación (desarrollo local, sin Docker)

**Frontend**
```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```

**Backend**
```bash
cd Backend
python -m venv .venv
./.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

La documentación interactiva de la API queda disponible en `http://localhost:8000/docs`.

## Variables de entorno

Cada carpeta tiene su propio `.env.example`:

- `Frontend/.env.example` → `VITE_API_URL`
- `Backend/.env.example` → `ENVIRONMENT`, `CORS_ORIGINS` y las de correo (abajo)
- `.env.example` (raíz) → `BACKEND_PORT`, `FRONTEND_PORT` y las de correo, usados solo por Docker Compose

Nunca commitear un `.env` con secretos reales.

## Correo del formulario de contacto

Lo que alguien escribe en el formulario llega al correo de Sofía. El remitente
es una dirección propia (ningún servidor deja firmar con la dirección de otro) y
quien escribió va en `Reply-To`, así que basta con darle a *Responder* para
contestarle directo.

Hay dos caminos de salida y se intentan en este orden:

1. **Resend**, por HTTPS. Es el que funciona en producción: Render no deja abrir
   conexiones SMTP salientes y el socket muere con `Network is unreachable`.
2. **SMTP**, de respaldo. Sirve en local y cubre a Resend si se cae.

Si los dos fallan, el mensaje no se da por entregado: el endpoint devuelve 502.

### Resend (principal)

1. Crear una cuenta en [resend.com](https://resend.com) y, en **API Keys**,
   generar una clave de permiso *Sending access*. Empieza por `re_`.
2. Verificar un dominio en **Domains** (añadiendo los registros DNS que Resend
   indica). Sin dominio propio se puede usar `onboarding@resend.dev`, pero solo
   entrega al correo con el que se abrió la cuenta: vale para probar, no para
   producción.
3. Rellenar en `Backend/.env`:

```bash
RESEND_API_KEY=re_loquesea
RESEND_FROM=Portafolio de Sofía <contacto@tudominio.com>
CONTACT_TO=tucorreo@gmail.com
```

`CONTACT_TO` es obligatorio si no hay SMTP configurado: sin él no hay a dónde
enviar. La clave se lee **solo** del entorno y nunca sale en los logs ni llega
al frontend, que sigue hablando únicamente con `POST /api/contact`.

### SMTP (respaldo)

Hace falta una **contraseña de aplicación** de Google — la contraseña normal de
la cuenta no sirve para SMTP:

1. Cuenta de Google → **Seguridad** → activar **Verificación en 2 pasos**.
2. En la misma pantalla, **Contraseñas de aplicaciones** → crear una nueva
   (nombre: "Portafolio"). Google devuelve 16 letras.
3. Copiar `Backend/.env.example` a `Backend/.env` y rellenar:

```bash
SMTP_USER=tucorreo@gmail.com
SMTP_PASSWORD=las16letrasdegoogle
```

4. Reiniciar el backend y enviarse un mensaje de prueba desde el formulario.

Para comprobar solo las credenciales, sin pasar por el sitio:

```bash
cd Backend
./.venv/Scripts/python.exe -c "import smtplib,ssl,os; s=smtplib.SMTP('smtp.gmail.com',587,timeout=20); s.starttls(context=ssl.create_default_context()); s.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD']); print('credenciales OK'); s.quit()"
```

Detalles que conviene saber:

- **Sin ninguna de las dos vías configurada**, en `ENVIRONMENT=development` el
  mensaje no se envía: se escribe entero en el log del backend y el formulario
  responde bien, para poder trabajar sin secretos. En producción, en cambio, el
  envío falla a la vista (502) en vez de perder el mensaje en silencio.
- En el log se ve por dónde salió cada mensaje: `entregado por Resend`,
  `entregado por SMTP`, o el aviso de que Resend falló y se pasó al respaldo.
  Las credenciales no aparecen nunca.
- Si el envío falla, **el texto queda igualmente en el log** del backend, y el
  formulario ofrece el correo directo con lo escrito ya dentro.
- `CONTACT_RATE_LIMIT` (5 por defecto) son los mensajes que se aceptan por IP y
  por hora, para que nadie use el formulario como manguera de spam.
- `CONTACT_TO` sirve para recibir los mensajes en una dirección distinta de la
  que los envía. Vacío = llegan a la misma cuenta.

## Docker

Requiere Docker Desktop corriendo. Desde la raíz del proyecto:

```bash
docker compose up --build
```

Esto construye ambas imágenes (multi-stage) y expone:
- Frontend en `http://localhost:5173`
- Backend en `http://localhost:8000`

Para detener:
```bash
docker compose down
```

## Comandos útiles

| Comando | Descripción |
|---|---|
| `npm run dev` (Frontend) | Servidor de desarrollo con HMR |
| `npm run build` (Frontend) | Type-check + build de producción |
| `npm run lint` (Frontend) | ESLint |
| `npm run format` (Frontend) | Prettier |
| `python scripts/extract_frames.py` (Frontend) | Regenera los fotogramas si cambias el video de `source-assets/video/` (requiere `opencv-python`) |
| `python scripts/prepare_reactions.py` (Frontend) | Recorta las reacciones de la muñequita al control de sonido |
| `pytest` (Backend) | Tests |
| `ruff check .` (Backend) | Lint |

## Estado del proyecto

En construcción, por fases. Ver historial de conversación / commits para el detalle de qué fase está activa.
