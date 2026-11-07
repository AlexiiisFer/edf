# Node + LibreOffice (calcul RITE du Cerema, voir tools/rite_worker.py)
FROM node:20-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libreoffice-calc-nogui python3-uno fonts-dejavu-core wget \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY tools ./tools
COPY vendor ./vendor
ENV PORT=3000 HOME=/tmp
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
