defmodule SignalServerWeb.SignalChannel do
  use Phoenix.Channel
  require Logger

  @impl true
  def join("signals:lobby", _payload, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    Phoenix.PubSub.subscribe(SignalServer.PubSub, "signals")
    {:noreply, socket}
  end

  @impl true
  def handle_info({:price, payload}, socket) do
    push(socket, "price", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_info({:meme, signals}, socket) do
    push(socket, "meme_signals", %{signals: signals})
    {:noreply, socket}
  end

  @impl true
  def handle_info({:x_signals, signals}, socket) do
    push(socket, "x_signals", %{signals: signals})
    {:noreply, socket}
  end

  @impl true
  def handle_in("ping", _payload, socket) do
    {:reply, {:ok, %{pong: true}}, socket}
  end
end
