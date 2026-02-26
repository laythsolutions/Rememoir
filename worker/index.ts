// Custom service worker additions — auto-merged by @ducanh2912/next-pwa into sw.js
// Handles Periodic Background Sync for journal reminder notifications

/* eslint-disable @typescript-eslint/no-explicit-any */
const sw = self as any;

sw.addEventListener("periodicsync", (event: any) => {
  if (event.tag !== "journal-reminder") return;
  event.waitUntil(
    sw.registration.showNotification("Time to journal ✦", {
      body: "Take a few minutes to reflect. Your future self will thank you.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "rememoir-daily",
    })
  );
});
