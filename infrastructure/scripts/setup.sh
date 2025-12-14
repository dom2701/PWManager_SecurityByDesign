#!/bin/bash
set -e

echo "Generating unique secrets..."

# Generate secrets
# Using openssl to generate random strings and tr/head to ensure they are clean and of correct length
PG_PASS=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 32)
SESS_SEC=$(openssl rand -hex 32)
MEK=$(openssl rand -hex 32)

echo "Applying manifests..."

# Apply base (Namespace, ServiceAccounts)
kubectl apply -f infrastructure/00-base.yaml

# Generate and apply TLS certificates
echo "Setting up TLS..."
chmod +x infrastructure/scripts/generate-certs.sh
./infrastructure/scripts/generate-certs.sh

# Create TLS secret (dry-run to allow idempotency)
kubectl create secret tls pwmanager-tls \
  --cert="CertificateAuthority/server.crt" \
  --key="CertificateAuthority/server.key" \
  -n pwmanager --dry-run=client -o yaml | kubectl apply -f -

# Apply config with substitution
# We use sed to replace the placeholders in the config file and pipe the result directly to kubectl
# This ensures secrets are never written to disk
sed -e "s/POSTGRES_PASSWORD_PLACEHOLDER/$PG_PASS/g" \
    -e "s/SESSION_SECRET_PLACEHOLDER/$SESS_SEC/g" \
    -e "s/MASTER_ENCRYPTION_KEY_PLACEHOLDER/$MEK/g" \
    infrastructure/01-config.yaml | kubectl apply -f -

# Apply data layer (Postgres, Redis)
kubectl apply -f infrastructure/02-data.yaml

# Apply application layer (Backend, Frontend)
kubectl apply -f infrastructure/03-app.yaml

# Apply network policies
kubectl apply -f infrastructure/04-network-policies.yaml

# Apply Ingress
kubectl apply -f infrastructure/05-ingress.yaml

echo "Deployment applied successfully."
