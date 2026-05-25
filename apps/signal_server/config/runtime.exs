import Config

port      = String.to_integer(System.get_env("PORT", "4001"))
geass_url = System.get_env("GEASS_API_URL", "https://geass.app")

config :signal_server, SignalServerWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: port],
  server: true,
  url: [host: System.get_env("HOST", "localhost"), port: port]

config :signal_server, geass_api_url: geass_url
