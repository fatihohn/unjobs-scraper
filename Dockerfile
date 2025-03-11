FROM node:22.2.0-bullseye

ENV WORKDIR=/app

RUN mkdir -p $WORKDIR

WORKDIR $WORKDIR

COPY ./docker-entrypoint.sh $WORKDIR

RUN chmod +x $WORKDIR/docker-entrypoint.sh

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    chromium \
    chromium-driver \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium

RUN npm uninstall -g yarn \
  && corepack enable \
  && corepack prepare yarn@stable --activate

ENTRYPOINT ["./docker-entrypoint.sh"]
