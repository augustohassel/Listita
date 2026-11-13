variable "project_id" {
  description = "ID del proyecto de Google Cloud Platform donde se habilitan las APIs."
  type        = string
}

variable "region" {
  description = "Región por defecto de GCP."
  type        = string
  default     = "us-central1"
}

variable "enable_github_oidc" {
  description = "Habilita Workload Identity Federation (OIDC) para despliegues desde GitHub Actions sin llaves JSON estáticas."
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "Repositorio de GitHub autorizado para OIDC en formato owner/repo."
  type        = string
  default     = "augustohassel/Listita"
}
