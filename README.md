#### Basic Commands

1. Build docker image:
    ```shell script
    docker build -t asynctracer .
    ```
2. Install dependencies:
    ```shell script
    docker run --rm -v $PWD:/usr/src/app asynctracer npm install
    ```
3. Run the container:
    ```shell script
    docker run --rm -p 8080:8080 -v $PWD:/usr/src/app --name asynctracer -d asynctracer npm run worker
    ```
4. Access shell:
    ```shell script
    docker exec -it asynctracer bash
    ```
5. Attach Logs:
    ```shell script
    docker logs --follow asynctracer
    ```
