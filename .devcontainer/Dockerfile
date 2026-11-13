FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# Instalar utilidades esenciales y Google Cloud CLI (gcloud)
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        git \
        curl \
        unzip \
        gnupg \
        apt-transport-https \
        ca-certificates \
        python3 \
    && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list \
    && apt-get update && apt-get -y install --no-install-recommends google-cloud-cli \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Instalar HashiCorp Terraform CLI
ARG TERRAFORM_VERSION=1.9.8
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${ARCH}.zip" -o /tmp/terraform.zip \
    && unzip -o /tmp/terraform.zip -d /usr/local/bin \
    && rm -f /tmp/terraform.zip /usr/local/bin/LICENSE.txt \
    && terraform --version \
    && gcloud --version

WORKDIR /workspaces/Listita
