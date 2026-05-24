import Config

config :signal_server, SignalServerWeb.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  url: [host: "localhost"],
  pubsub_server: SignalServer.PubSub

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
