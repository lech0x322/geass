defmodule SignalServer.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Phoenix.PubSub, name: SignalServer.PubSub},
      SignalServerWeb.Endpoint,
      SignalServer.Workers.PriceWorker,
      SignalServer.Workers.MemeWorker,
      SignalServer.Workers.XWorker,
    ]

    opts = [strategy: :one_for_one, name: SignalServer.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
