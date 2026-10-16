(() => {
  "use strict";

  const ROUTE_EVENT = "netflix-auto-skip-route-change-v1";
  const signalRouteChange = () => window.dispatchEvent(new Event(ROUTE_EVENT));

  for (const method of ["pushState", "replaceState"]) {
    const original = window.history[method];
    window.history[method] = function (...args) {
      const result = original.apply(this, args);
      signalRouteChange();
      return result;
    };
  }

  window.addEventListener("popstate", signalRouteChange);
  window.addEventListener("hashchange", signalRouteChange);
})();
