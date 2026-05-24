defmodule SignalServerWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :signal_server

  socket "/socket", SignalServerWeb.UserSocket,
    websocket: [timeout: 45_000],
    longpoll:  false

  plug Corsica,
    origins: {:system, "ALLOWED_ORIGINS"},
    allow_headers: ["content-type"]

  plug Plug.RequestId
  plug Plug.Logger
end
