FROM hexpm/elixir:1.16.2-erlang-26.2.4-alpine-3.19.1 AS build

RUN apk add --no-cache build-base git

WORKDIR /app
ENV MIX_ENV=prod

RUN mix local.hex --force && mix local.rebar --force

# Build context = repo root; signal_server sources live under apps/signal_server/
COPY apps/signal_server/mix.exs ./
RUN mix deps.get --only prod
RUN mix deps.compile

COPY apps/signal_server/config config
COPY apps/signal_server/lib lib
RUN mix compile
RUN mix release

FROM alpine:3.19.1 AS app

RUN apk add --no-cache libstdc++ openssl ncurses-libs

WORKDIR /app
RUN adduser -h /app -u 1000 -s /bin/sh -D app
USER app

COPY --from=build --chown=app:app /app/_build/prod/rel/signal_server ./

ENV PORT=4001 \
    PHX_SERVER=true \
    GEASS_API_URL=https://geass.app \
    ALLOWED_ORIGINS=https://geass.app

EXPOSE 4001
CMD ["bin/signal_server", "start"]
