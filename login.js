const supabaseClient = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const messageEl = document.getElementById("message");
const loginBtn = document.getElementById("loginBtn");

function showMessage(text, type = "ok") {
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;
}

async function checkAlreadyLogin() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    window.location.replace("admin.html");
  }
}

loginBtn.addEventListener("click", async () => {
  const email = document
    .getElementById("email")
    .value
    .trim();

  const password = document
    .getElementById("password")
    .value;

  if (!email || !password) {
    showMessage("請輸入 Email 與密碼", "err");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "登入中...";

  const {
    data,
    error
  } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    showMessage("登入失敗：" + error.message, "err");

    loginBtn.disabled = false;
    loginBtn.textContent = "登入";

    return;
  }

  showMessage("登入成功", "ok");

  setTimeout(() => {
    window.location.replace("admin.html");
  }, 500);
});

checkAlreadyLogin();