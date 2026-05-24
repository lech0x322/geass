import Config

config :signal_server, SignalServerWeb.Endpoint,
  http: [port: 4001],
  check_origin: false,
  debug_errors: true

config :logger, level: :debug
