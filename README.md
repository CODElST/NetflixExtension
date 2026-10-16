# Netflix Auto Skip Intro & Recap

A small Chrome/Chromium extension that automatically clicks Netflix's **Skip
Recap** and **Skip Intro** controls.

## Settings

Click the extension icon to open its popup. Use the separate toggles to enable
or disable automatic intro skipping and recap skipping. Both are on by default,
and the choices sync through Chrome storage.

## How it works

- It runs on `www.netflix.com` and watches the player UI for Netflix's skip
  buttons or buttons labeled **Skip Intro** or **Skip Recap**.
- A `MutationObserver` reacts to player UI changes. If a matching button is
  mounted but hidden, transition and animation events let the extension check
  again when it becomes visible. It does not use a polling loop.
- After skipping a recap, it keeps watching for an intro only when intro
  skipping is enabled. When there are no more enabled skip types to look for,
  it disconnects the player observer.
- A small script in the page's main JavaScript world listens for History API
  and navigation events. When Netflix changes to another episode, it signals
  the extension to resume watching. This is event-driven and does not poll the
  URL.

The extension uses no extra browser permissions beyond its Netflix site match.

## Install locally

1. Open `chrome://extensions` in Chrome (or the equivalent extensions page in
   another Chromium browser).
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this project folder.
4. Reload the extension and refresh the Netflix tab if it was already open.
