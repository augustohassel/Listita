# Configuración de Sincronización con Google Drive (Zero-Backend)

**Listita** permite sincronizar listados, elementos y rankings entre dispositivos utilizando directamente el Google Drive personal de cada usuario, sin servidores intermedios ni bases de datos centrales.

---

## 1. Habilitar APIs en GCP (Terraform)

Las APIs necesarias (`drive.googleapis.com`, `serviceusage.googleapis.com` y `cloudresourcemanager.googleapis.com`) se gestionan de forma declarativa en [`infra/`](../infra/README.md).

```sh
cd infra
terraform init -backend-config="bucket=<TU_BUCKET_TF_STATE>"
terraform apply -var="project_id=<TU_GCP_PROJECT_ID>"
```

---

## 2. Crear OAuth 2.0 Web Client ID (Paso único en GCP Console)

1. Ingresar a **Google Cloud Console → APIs & Services → OAuth consent screen**.
2. Elegir tipo **External** (o **Internal** si es Google Workspace privado) y completar nombre de la app (`Listita`) y correos de contacto.
3. En **Scopes**, agregar el scope mínimo:
   - `https://www.googleapis.com/auth/drive.file`
4. Si la app está en modo *Testing*, agregar los correos de prueba en **Test users** (o publicarla en producción para uso abierto).
5. Ir a **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
6. Seleccionar **Application type: Web application**.
7. Configurar:
   - **Authorized JavaScript origins**:
     - `http://localhost:5174` (desarrollo local)
     - `https://<tu-usuario>.github.io` (producción en GitHub Pages)
   - **Authorized redirect URIs**: no son necesarias para el flujo *Token Model* de Google Identity Services (GIS).
8. Copiar el **Client ID** generado (formato `1234567890-xxx.apps.googleusercontent.com`). Este identificador es público (no hay `client_secret`).

---

## 3. Configurar en Desarrollo Local y GitHub Actions

### Desarrollo local
Copiar `.env.example` a `.env.local` y completar `VITE_GOOGLE_CLIENT_ID`:

```sh
cp .env.example .env.local
```

### Producción (GitHub Pages)
En el repositorio de GitHub → **Settings → Secrets and variables → Actions → Variables**, definir:
- `VITE_GOOGLE_CLIENT_ID`: el Web Client ID creado en el paso 2.

Alternativamente, cualquier usuario puede ingresar su propio Client ID desde **Ajustes → Sincronización con Google Drive → Configurar Google OAuth Client ID**.
