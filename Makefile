tag:
	docker build -f Dockerfile.dist -t asdozzz/unitman-front:$(VERSION) .
	docker push asdozzz/unitman-front:$(VERSION)
