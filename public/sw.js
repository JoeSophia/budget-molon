// Service worker : affiche les notifications envoyées par le serveur et ouvre l'app au clic.
self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.titre || "Budget Molon", { body: d.corps, icon: "/icones/192", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data.url));
});
