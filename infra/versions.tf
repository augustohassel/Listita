terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Configurar el bucket de estado en ejecución mediante:
  # terraform init -backend-config="bucket=<TU_BUCKET_TF_STATE>"
  backend "gcs" {
    prefix = "listita/terraform/state"
  }
}
