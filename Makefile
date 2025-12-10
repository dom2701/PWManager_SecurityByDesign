.PHONY: setup teardown clean

# Auto-detect k3s configuration if not explicitly set
ifneq (,$(wildcard /etc/rancher/k3s/k3s.yaml))
    export KUBECONFIG ?= /etc/rancher/k3s/k3s.yaml
endif

setup:
	@echo "Setting up PWManager..."
	@# Check connection
	@kubectl cluster-info >/dev/null 2>&1 || (echo "Error: Cannot connect to Kubernetes cluster. Please check your kubeconfig or KUBECONFIG environment variable." && exit 1)
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
