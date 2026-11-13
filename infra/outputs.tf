output "enabled_apis" {
  description = "APIs habilitadas en el proyecto GCP."
  value       = sort(keys(google_project_service.apis))
}

output "github_actions_wif_provider" {
  description = "Nombre completo del Workload Identity Provider para GitHub Actions (si enable_github_oidc = true)."
  value       = var.enable_github_oidc ? google_iam_workload_identity_pool_provider.github_oidc[0].name : null
}

output "github_actions_service_account" {
  description = "Email de la Service Account para GitHub Actions (si enable_github_oidc = true)."
  value       = var.enable_github_oidc ? google_service_account.github_actions[0].email : null
}
