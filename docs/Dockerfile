FROM squidfunk/mkdocs-material AS builder

# Used by mkdocs-encryptcontent-plugin in `mkdocs.yml`
# ARG DOCS_PASSWORD=changeme
# ENV DOCS_PASSWORD=${DOCS_PASSWORD}

ARG APP_NAME=mkdocs

# Install mkdocs extensions
RUN pip install \
        mkdocs-table-reader-plugin \
        mkdocs-encryptcontent-plugin

# Prepare the workdir
RUN mkdir -p /opt/cublueprint/${APP_NAME}
WORKDIR /opt/cublueprint/${APP_NAME}
COPY . .

# Build the documentation
RUN mkdocs build


# ----------------------------


FROM nginx:latest AS runner

# This has to agree with the ARG in the builder stage
ARG APP_NAME=mkdocs

# Copy the built app
COPY --from=builder /opt/cublueprint/${APP_NAME}/site /usr/share/nginx/html/

# Serve the documentation
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]