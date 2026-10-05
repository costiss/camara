# One container: the Go server serves the built SPA and proxies /api with cache and rate limits.
FROM node:24-alpine AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN VITE_API_PROXY=/api npm run build

FROM golang:1.24-alpine AS server
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /app .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=server /app /app
COPY --from=web /web/dist /web
ENV STATIC_DIR=/web \
    PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD ["/app", "healthcheck"]
ENTRYPOINT ["/app"]
