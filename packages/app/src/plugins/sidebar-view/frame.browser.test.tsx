import React, { act, useMemo } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import { SidebarViewFrame } from "./frame";
import { useSidebarViewSelection, type SidebarViewStorage } from "./selection";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let defaultRenders = 0;
function DefaultView() {
  defaultRenders++;
  return <div>Default sidebar</div>;
}
function PluginView() {
  return <div>Stored plugin sidebar</div>;
}
function Sidebar({ storage }: { storage: SidebarViewStorage }) {
  const selection = useSidebarViewSelection(storage);
  const fallback = useMemo(() => <DefaultView />, []);
  const selected =
    selection.state.status === "ready" && selection.state.selection === "example/workspaces";
  const view = selected ? <PluginView /> : null;
  return (
    <SidebarViewFrame
      state={selection.state}
      fallback={fallback}
      header={<div>Sidebar navigation</div>}
      reload={selection.reload}
    >
      {view}
    </SidebarViewFrame>
  );
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  defaultRenders = 0;
  client.clear();
});

function deferredStorage() {
  let finishRead: (value: string) => void = () => {
    throw new Error("Read not started");
  };
  const read = new Promise<string>((resolve) => {
    finishRead = resolve;
  });
  const storage: SidebarViewStorage = { getItem: () => read, setItem: async () => {} };
  return { storage, finishRead };
}

it("never renders the default before a stored plugin selection is known", async () => {
  const { storage, finishRead } = deferredStorage();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <Sidebar storage={storage} />
      </QueryClientProvider>,
    ),
  );
  expect(defaultRenders).toBe(0);
  await act(async () => {
    finishRead("example/workspaces");
  });
  await expect.poll(() => container?.textContent).toContain("Stored plugin sidebar");
  expect(defaultRenders).toBe(0);
});

it("keeps the header above a plugin view and its loading, and leaves it to the default view", async () => {
  const stored = deferredStorage();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const render = (storage: SidebarViewStorage) =>
    root?.render(
      <QueryClientProvider client={client}>
        <Sidebar key={storage === stored.storage ? "stored" : "default"} storage={storage} />
      </QueryClientProvider>,
    );
  await act(async () => render(stored.storage));
  expect(container.textContent).toBe("Sidebar navigation");
  await act(async () => {
    stored.finishRead("example/workspaces");
  });
  await expect.poll(() => container?.textContent).toBe("Sidebar navigationStored plugin sidebar");

  client.clear();
  const fallback = deferredStorage();
  await act(async () => render(fallback.storage));
  await act(async () => {
    fallback.finishRead("default");
  });
  await expect.poll(() => container?.textContent).toBe("Default sidebar");
});
