self.addEventListener("push", event => {
  let data;
  try { data = event.data.json(); } catch { return; }
  const url = typeof data.url === "string" && /^\/evenements\/[\w-]+$/.test(data.url) ? data.url : "/";
  event.waitUntil(self.registration.showNotification("FSC — rappel", {
    body: "Un événement approche. Ouvre FSC pour le consulter.", tag: data.tag, data: { url },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
// No fetch handler: private pages and events are never cached by this worker.
