// Tauri supplies its bridge before page scripts execute. Do not load the
// launcher or issue native commands when someone opens the dev URL in Chrome.
if ("__TAURI_INTERNALS__" in window) {
  void import("./index");
} else {
  document.title = "ShardBrowser";
  const root = document.getElementById("root");
  if (root) {
    const heading = document.createElement("h1");
    heading.textContent = "Chỉ sử dụng trong ứng dụng desktop";
    const detail = document.createElement("p");
    detail.textContent = "Đóng tab trình duyệt này và mở ShardBrowser bằng run.cmd.";
    root.replaceChildren(heading, detail);
    root.style.cssText = "max-width:640px;margin:80px auto;padding:24px;font:16px/1.6 'Segoe UI',sans-serif";
  }
  document.documentElement.lang = "vi";
}
