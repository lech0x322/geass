defmodule SignalServerWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :signal_server

  socket "/socket", SignalServerWeb.UserSocket,
    websocket: [timeout: 45_000],
    longpoll:  false

  plug :health_check

  plug Corsica,
    origins: "*",
    allow_headers: :all

  plug Plug.RequestId
  plug Plug.Logger

  defp health_check(%Plug.Conn{request_path: "/health"} = conn, _opts) do
    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(200, ~s({"ok":true}))
    |> Plug.Conn.halt()
  end
  defp health_check(conn, _opts), do: conn
end
