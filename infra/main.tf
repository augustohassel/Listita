locals {
  core_apis = toset([
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "drive.googleapis.com",
  ])

  oidc_apis = var.enable_github_oidc ? toset([
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
  ]) : toset([])
}

resource "google_project_service" "apis" {
  for_each = setunion(local.core_apis, local.oidc_apis)

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_service_account" "github_actions" {
  count = var.enable_github_oidc ? 1 : 0

  account_id   = "listita-github-tf"
  display_name = "Listita GitHub Actions Terraform"
  project      = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "github_actions_editor" {
  count = var.enable_github_oidc ? 1 : 0

  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"
  member  = "serviceAccount:${google_service_account.github_actions[0].email}"
}

resource "google_iam_workload_identity_pool" "github" {
  count = var.enable_github_oidc ? 1 : 0

  workload_identity_pool_id = "listita-github-pool"
  display_name              = "Listita GitHub Actions Pool"
  project                   = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github_oidc" {
  count = var.enable_github_oidc ? 1 : 0

  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_wif_binding" {
  count = var.enable_github_oidc ? 1 : 0

  service_account_id = google_service_account.github_actions[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository/${var.github_repository}"
}
