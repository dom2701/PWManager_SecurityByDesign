.PHONY: setup teardown clean build-local setup-local apply-setup

# Variables
BACKEND_IMAGE=ghcr.io/dom2701/pwmanager_securitybydesign/backend
FRONTEND_IMAGE=ghcr.io/dom2701/pwmanager_securitybydesign/frontend

build-local:
	@echo "Building Docker images locally..."
	@docker build -t $(BACKEND_IMAGE):latest ./backend
	@docker build -t $(FRONTEND_IMAGE):latest ./frontend
	@echo "Images built."

load-k3s:
	@echo "Loading images into k3s..."
	@# Pipe docker save output directly to k3s import to avoid temporary files
	@docker save $(BACKEND_IMAGE):latest | sudo k3s ctr images import -
	@docker save $(FRONTEND_IMAGE):latest | sudo k3s ctr images import -
	@echo "Images loaded into k3s."

setup-local: build-local load-k3s
	@echo "Configuring for local setup (using latest tag)..."
	@# Backup the original file
	@cp infrastructure/03-app.yaml infrastructure/03-app.yaml.bak
	@# Modify the file in place to use :latest and IfNotPresent
	@sed -i "s|image: $(BACKEND_IMAGE).*|image: $(BACKEND_IMAGE):latest|g" infrastructure/03-app.yaml
	@sed -i "s|image: $(FRONTEND_IMAGE).*|image: $(FRONTEND_IMAGE):latest|g" infrastructure/03-app.yaml
	@sed -i "s|imagePullPolicy: .*|imagePullPolicy: IfNotPresent|g" infrastructure/03-app.yaml
	@# Run setup
	@$(MAKE) apply-setup
	@# Restore the original file
	@mv infrastructure/03-app.yaml.bak infrastructure/03-app.yaml
	@echo "Restored infrastructure/03-app.yaml to original state."

setup:
	@echo "Configuring for remote setup (using GHCR)..."
	@# Ensure we are using the file as is (which should contain the fixed digests)
	@$(MAKE) apply-setup

apply-setup:
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
