.PHONY: setup teardown clean build-local

build-local:
	@echo "Building Docker images locally..."
	@docker build -t ghcr.io/dom2701/pwmanager_securitybydesign/backend:latest ./backend
	@docker build -t ghcr.io/dom2701/pwmanager_securitybydesign/frontend:latest ./frontend
	@echo "Images built."

load-k3s:
	@echo "Loading images into k3s..."
	@# Pipe docker save output directly to k3s import to avoid temporary files
	@docker save ghcr.io/dom2701/pwmanager_securitybydesign/backend:latest | sudo k3s ctr images import -
	@docker save ghcr.io/dom2701/pwmanager_securitybydesign/frontend:latest | sudo k3s ctr images import -
	@echo "Images loaded into k3s."

setup:
	@echo "Setting up PWManager..."
	@# Check connection
	@kubectl cluster-info >/dev/null 2>&1 || (echo "Error: Cannot connect to Kubernetes cluster. Please check your kubeconfig." && exit 1)
	@# Delete namespace if it exists to ensure fresh start (deletes all data)
	@kubectl delete namespace pwmanager --ignore-not-found=true
	@echo "Waiting for namespace deletion to complete..."
	@# Wait loop because 'kubectl wait' can be flaky if resource is already gone
	@while kubectl get namespace pwmanager >/dev/null 2>&1; do sleep 1; done
	@chmod +x infrastructure/scripts/setup.sh
	@./infrastructure/scripts/setup.sh
	@echo "Setup complete. Pods are starting..."

teardown:
	@echo "Tearing down PWManager..."
	@kubectl delete namespace pwmanager --ignore-not-found=true
	@echo "Teardown complete."

clean: teardown
