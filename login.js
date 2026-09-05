(() => {
  const { client, showMessage, withButton } = DrinkApp;
  const form = document.getElementById("loginForm");
  const button = document.getElementById("loginBtn");
  const message = document.getElementById("message");

  form.addEventListener("submit", event => {
    event.preventDefault();
    withButton(button, async () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      if (!email || !password) throw new Error("請輸入 Email 與密碼");
      button.textContent = "登入中...";
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.replace("admin.html");
      } finally {
        button.textContent = "登入";
      }
    }, error => showMessage(message, "登入失敗：" + error.message, "err"));
  });

  async function init() {
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session) window.location.replace("admin.html");
    } catch (error) {
      showMessage(message, "登入狀態檢查失敗：" + error.message, "err");
    }
  }
  init();
})();
