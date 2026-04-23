.PHONY: docker_build_cpu docker_build_gpu docker_run_cpu docker_run_gpu

PORT ?= 8000
WEIGHTS_ABS = $(subst \,/,$(abspath $(WEIGHTS)))

docker_build_cpu:
	docker build -f docker/Dockerfile -t alertness-api:cpu .

docker_build_gpu:
	docker build -f docker/Dockerfile.gpu -t alertness-api:gpu .

docker_run_cpu:
	@if "$(WEIGHTS)"=="" (echo Usage: make docker_run_cpu WEIGHTS=yolov5/runs/train/exp2/weights/best.pt [PORT=8000] [WEIGHTS_ENV=/weights/best.pt] && exit /b 1)
	docker run -d --rm -p $(PORT):8000 -v "$(WEIGHTS_ABS):/weights/best.pt:ro" -e DEVICE=cpu $(if $(WEIGHTS_ENV),-e WEIGHTS=$(WEIGHTS_ENV),) alertness-api:cpu

docker_run_gpu:
	@if "$(WEIGHTS)"=="" (echo Usage: make docker_run_gpu WEIGHTS=yolov5/runs/train/exp2/weights/best.pt [PORT=8000] [WEIGHTS_ENV=/weights/best.pt] && exit /b 1)
	docker run -d --rm --gpus all -p $(PORT):8000 -v "$(WEIGHTS_ABS):/weights/best.pt:ro" -e DEVICE=0 $(if $(WEIGHTS_ENV),-e WEIGHTS=$(WEIGHTS_ENV),) alertness-api:gpu

web_dev:
	cd web && bun run dev

server_dev:
	cd api && uvicorn api.main:app --host 0.0.0.0 --port 8000