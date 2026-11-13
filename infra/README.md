# Infraestructura GCP — Listita

Esta carpeta gestiona declarativamente con Terraform las APIs de Google Cloud Platform necesarias para la sincronización cliente-a-cliente de **Listita** con Google Drive (`drive.googleapis.com`), junto con soporte opcional de **Workload Identity Federation (OIDC)** para GitHub Actions.

## Recursos gestionados
- `cloudresourcemanager.googleapis.com`
- `serviceusage.googleapis.com`
- `drive.googleapis.com`
- Opcional (`enable_github_oidc = true`): `iam.googleapis.com`, `iamcredentials.googleapis.com`, Service Account y Workload Identity Pool/Provider para GitHub OIDC.

## Uso local

1. Copiar `terraform.tfvars.example` a `terraform.tfvars` (ignorado por Git o completado localmente) y definir `project_id`.
2. Inicializar Terraform apuntando a un bucket GCS para el estado remoto (o usar `-backend=false` solo para validar):
   ```sh
   cd infra
   terraform init -backend-config="bucket=<TU_BUCKET_TF_STATE>"
   terraform plan
   terraform apply
   ```

> **Nota**: La creación de la pantalla de consentimiento OAuth y del **Web Client ID** (`VITE_GOOGLE_CLIENT_ID`) se realiza una única vez desde Google Cloud Console, ya que no existe recurso estable en Terraform para clientes OAuth de aplicaciones web externas. Ver [docs/CONFIGURACION_GOOGLE_DRIVE.md](../docs/CONFIGURACION_GOOGLE_DRIVE.md).
