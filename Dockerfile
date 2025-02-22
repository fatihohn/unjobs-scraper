FROM node:22.2.0-bullseye

ENV WORKDIR=/app

RUN mkdir -p $WORKDIR

WORKDIR $WORKDIR

COPY ./docker-entrypoint.sh $WORKDIR

RUN chmod +x $WORKDIR/docker-entrypoint.sh

RUN npm uninstall -g yarn \
  && corepack enable \
  && corepack prepare yarn@stable --activate

ENTRYPOINT ["./docker-entrypoint.sh"]
