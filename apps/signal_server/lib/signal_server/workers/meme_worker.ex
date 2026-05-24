defmodule SignalServer.Workers.MemeWorker do
  use GenServer
  require Logger

  @interval 60_000

  def start_link(_), do: GenServer.start_link(__MODULE__, %{last: []}, name: __MODULE__)

  @impl true
  def init(state) do
    send(self(), :fetch)
    {:ok, state}
  end

  @impl true
  def handle_info(:fetch, %{last: last} = state) do
    new_state =
      case fetch_signals() do
        {:ok, signals} ->
          new = Enum.reject(signals, fn s -> Enum.any?(last, &(&1["id"] == s["id"])) end)
          if new != [] do
            Phoenix.PubSub.broadcast(SignalServer.PubSub, "signals", {:meme, signals})
          end
          %{state | last: signals}
        {:error, err} ->
          Logger.warning("MemeWorker: #{inspect(err)}")
          state
      end

    Process.send_after(self(), :fetch, @interval)
    {:noreply, new_state}
  end

  defp fetch_signals do
    geass_url = Application.get_env(:signal_server, :geass_api_url, "https://geass.app")
    case Req.get("#{geass_url}/api/trends/meme") do
      {:ok, %{body: %{"signals" => signals}}} -> {:ok, signals}
      {:ok, _}                                -> {:ok, []}
      {:error, err}                           -> {:error, err}
    end
  end
end
