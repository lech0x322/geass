defmodule SignalServer.MixProject do
  use Mix.Project

  def project do
    [
      app: :signal_server,
      version: "0.1.0",
      elixir: "~> 1.15",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {SignalServer.Application, []}
    ]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:phoenix_pubsub, "~> 2.1"},
      {:bandit, "~> 1.5"},
      {:jason, "~> 1.4"},
      {:req, "~> 0.5"},
      {:corsica, "~> 2.1"}
    ]
  end
end
