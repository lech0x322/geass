import Config

port      = String.to_integer(System.get_env("PORT", "4001"))
geass_url = System.get_env("GEASS_API_URL", "https://geass.app")
origins   = System.get_env("ALLOWED_ORIGINS", "https://geass.app,http://localhost:3000")

config :signal_server, SignalServerWeb.Endpoint,
  http: [port: port],
  url: [host: System.get_env("HOST", "localhost"), port: port],
  check_origin: String.split(origins, ",")

config :signal_server, geass_api_url: geass_url
