// Run immediately to prevent flash of wrong theme
(function () {
  if (typeof window === "undefined") return;
  const theme = localStorage.getItem("theme") || "dark";
  document.documentElement.classList.toggle("dark", theme === "dark");
})();
