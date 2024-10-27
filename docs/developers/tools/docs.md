```bash
alias mkdocs="docker run --rm -it -p 8000:8000 -v $PWD:/docs squidfunk/mkdocs-material"
```

```bash
docker build -t squidfunk/mkdocs-material .
```

```bash
mkdocs serve --dev-addr=0.0.0.0:8000
```

Requirements from:
https://squidfunk.github.io/mkdocs-material/plugins/requirements/image-processing/