#### Basic Commands

1. Install dependencies:
    ```shell script
    docker run --rm -v $PWD:/usr/src/app -w /usr/src/app node:12 npm install
    ```
2. Run the container:
    ```shell script
    docker-compose up -d
    ```
3. Access shell:
    ```shell script
    docker exec -it worker bash
    ```
4. Attach Logs:
    ```shell script
    docker-compose logs -f
    ```
5. Stop the container:
    ```shell script
    docker-compose down
    ```
6. Run example:
    ```shell script
    docker run --rm -v $PWD:/usr/src/app -w /usr/src/app node:12 node index.js
    ```
