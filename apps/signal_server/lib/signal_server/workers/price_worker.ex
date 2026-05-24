defmodule SignalServer.Workers.PriceWorker do
  use GenServer
  require Logger

  @interval 30_000

  def start_link(_), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)

  @impl true
  def init(state) do
    send(self(), :fetch)
    {:ok, state}
  end

  @impl true
  def handle_info(:fetch, state) do
    fetch_and_broadcast()
    Process.send_after(self(), :fetch, @interval)
    {:noreply, state}
  end

  defp fetch_and_broadcast do
    url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true"
    case Req.get(url) do
      {:ok, %{body: body}} ->
        payload = %{
          price:  get_in(body, ["solana", "usd"]),
          change: get_in(body, ["solana", "usd_24h_change"])
        }
        Phoenix.PubSub.broadcast(SignalServer.PubSub, "signals", {:price, payload})
      {:error, err} ->
        Logger.warning("PriceWorker: #{inspect(err)}")
    end
  end
end
