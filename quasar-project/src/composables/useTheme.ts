import { ref } from "vue";

const isDark = ref(false);
let initialized = false;

function applyTheme(value: boolean) {
  isDark.value = value;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = value ? "dark" : "light";
    localStorage.setItem("bebe-theme", value ? "dark" : "light");
  }
}

export function useTheme() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    applyTheme(window.localStorage.getItem("bebe-theme") === "dark");
  }

  function toggleTheme() {
    applyTheme(!isDark.value);
  }

  return { isDark, toggleTheme };
}
