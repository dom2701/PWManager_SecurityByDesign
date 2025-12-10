.PHONY: setup teardown clean

setup:
	@echo "Setting up PWManager..."
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
