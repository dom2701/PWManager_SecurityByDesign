#!/bin/bash
set -e

CERT_DIR="CertificateAuthority"

# Check if certificates already exist
if [ -f "$CERT_DIR/rootCA.pem" ] && [ -f "$CERT_DIR/server.crt" ] && [ -f "$CERT_DIR/server.key" ]; then
  echo "Certificates already exist in '$CERT_DIR'. Skipping generation."
  exit 0
fi

echo "Generating Certificate Authority (CA) in '$CERT_DIR'..."

mkdir -p "$CERT_DIR"

# 1. Root CA Private Key
openssl genrsa -out "$CERT_DIR/rootCA.key" 4096

# 2. Root CA Certificate
openssl req -x509 -new -nodes -key "$CERT_DIR/rootCA.key" -sha256 -days 365 \
  -out "$CERT_DIR/rootCA.pem" \
  -subj "/C=DE/ST=BW/L=Stuttgart/O=DHBW/OU=SecurityByDesign/CN=PWManager Root CA"

echo "Root CA generated."

# 3. Server Private Key
openssl genrsa -out "$CERT_DIR/server.key" 2048

# 4. CSR Configuration
cat > "$CERT_DIR/csr.conf" <<EOF
[ req ]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[ dn ]
C = DE
ST = BW
L = Stuttgart
O = DHBW
OU = PWManager
CN = localhost

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost
DNS.2 = pwmanager.local
DNS.3 = backend
DNS.4 = frontend
IP.1 = 127.0.0.1
IP.2 = 192.168.42.140
EOF

# 5. CSR and Signing
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" -config "$CERT_DIR/csr.conf"

openssl x509 -req -in "$CERT_DIR/server.csr" -CA "$CERT_DIR/rootCA.pem" -CAkey "$CERT_DIR/rootCA.key" \
  -CAcreateserial -out "$CERT_DIR/server.crt" -days 365 -sha256 -extfile "$CERT_DIR/csr.conf" -extensions req_ext

echo "Server certificate generated and signed."

# Cleanup
rm "$CERT_DIR/server.csr" "$CERT_DIR/csr.conf" "$CERT_DIR/rootCA.srl" 2>/dev/null || true
