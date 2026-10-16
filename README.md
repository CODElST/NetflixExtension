# Netflix Auto Skip Intro & Recap

A small Chrome/Chromium extension that clicks Netflix's **Skip Intro** and
**Skip Recap** controls as soon as they appear.

## Install locally

1. Open `chrome://extensions` in Chrome (or the equivalent extensions page in
   another Chromium browser).
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this project folder.
4. Refresh the Netflix tab if it is already open.

The extension only runs on `www.netflix.com`. It watches the player UI for
Netflix's skip controls and clicks them when they become visible. It does not
need extra browser permissions.
