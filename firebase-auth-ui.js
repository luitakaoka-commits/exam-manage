/**
 * Firebase Authentication UI
 * ログイン / 新規登録 / ログアウト の UI を管理
 */

(function () {
  'use strict';

  // ─── CSS スタイル ───
  const style = document.createElement('style');
  style.textContent = `
    /* 認証オーバーレイ */
    #firebase-auth-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 50%, #2e1065 100%);
      font-family: 'Zen Kaku Gothic New', sans-serif;
      opacity: 1;
      transition: opacity 0.4s ease;
    }
    #firebase-auth-overlay.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    #firebase-auth-overlay * {
      box-sizing: border-box;
    }

    .auth-card {
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 40px 32px 32px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1);
      animation: auth-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes auth-slide-up {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .auth-logo {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(109, 40, 217, 0.3);
    }
    .auth-logo svg {
      width: 28px;
      height: 28px;
      color: white;
    }

    .auth-title {
      font-family: 'Shippori Mincho', serif;
      font-size: 22px;
      font-weight: 700;
      color: #1c1917;
      text-align: center;
      margin-bottom: 4px;
    }
    .auth-subtitle {
      font-size: 13px;
      color: #78716c;
      text-align: center;
      margin-bottom: 28px;
    }

    .auth-input-group {
      margin-bottom: 16px;
    }
    .auth-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #44403c;
      margin-bottom: 6px;
    }
    .auth-input {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid #d6d3d1;
      border-radius: 12px;
      font-size: 15px;
      font-family: inherit;
      color: #1c1917;
      background: #fafaf9;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }
    .auth-input:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
      background: white;
    }
    .auth-input::placeholder {
      color: #a8a29e;
    }

    .auth-btn {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }
    .auth-btn-primary {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
      box-shadow: 0 4px 16px rgba(109, 40, 217, 0.3);
    }
    .auth-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(109, 40, 217, 0.4);
    }
    .auth-btn-primary:active {
      transform: translateY(0);
    }
    .auth-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .auth-switch {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: #78716c;
    }
    .auth-switch a {
      color: #7c3aed;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .auth-switch a:hover {
      text-decoration: underline;
    }

    .auth-error {
      background: #fef2f2;
      color: #dc2626;
      font-size: 13px;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 16px;
      display: none;
      border: 1px solid #fecaca;
    }
    .auth-error.visible {
      display: block;
      animation: auth-shake 0.4s ease;
    }
    @keyframes auth-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-6px); }
      75% { transform: translateX(6px); }
    }

    .auth-loading {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: auth-spin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }
    @keyframes auth-spin {
      to { transform: rotate(360deg); }
    }

    /* ログアウトボタン */
    #firebase-logout-btn {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 9999;
      display: none;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid #e7e5e4;
      border-radius: 10px;
      font-family: 'Zen Kaku Gothic New', sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #78716c;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    #firebase-logout-btn:hover {
      background: white;
      color: #dc2626;
      border-color: #fecaca;
    }
    #firebase-logout-btn svg {
      width: 14px;
      height: 14px;
    }

    /* 初期ローディング */
    #firebase-init-loading {
      position: fixed;
      inset: 0;
      z-index: 99998;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 50%, #2e1065 100%);
      font-family: 'Zen Kaku Gothic New', sans-serif;
    }
    .init-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: auth-spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    .init-text {
      color: rgba(255,255,255,0.8);
      font-size: 14px;
    }
  `;
  document.head.appendChild(style);

  // ─── ローディング画面（認証状態確認中） ───
  const loadingEl = document.createElement('div');
  loadingEl.id = 'firebase-init-loading';
  loadingEl.innerHTML = `
    <div class="init-spinner"></div>
    <p class="init-text">読み込み中...</p>
  `;
  document.body.appendChild(loadingEl);

  // ─── 認証オーバーレイ ───
  const overlay = document.createElement('div');
  overlay.id = 'firebase-auth-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </div>
      <h1 class="auth-title">テスト勉強 進度管理</h1>
      <p class="auth-subtitle" id="auth-subtitle">アカウントにログイン</p>

      <div class="auth-error" id="auth-error"></div>

      <div class="auth-input-group">
        <label class="auth-label" for="auth-email">メールアドレス</label>
        <input class="auth-input" id="auth-email" type="email" placeholder="example@mail.com" autocomplete="email" />
      </div>
      <div class="auth-input-group">
        <label class="auth-label" for="auth-password">パスワード</label>
        <input class="auth-input" id="auth-password" type="password" placeholder="6文字以上" autocomplete="current-password" />
      </div>
      <div class="auth-input-group" id="auth-confirm-group" style="display:none">
        <label class="auth-label" for="auth-confirm">パスワード（確認）</label>
        <input class="auth-input" id="auth-confirm" type="password" placeholder="もう一度入力" autocomplete="new-password" />
      </div>

      <button class="auth-btn auth-btn-primary" id="auth-submit">ログイン</button>

      <div class="auth-switch">
        <span id="auth-switch-text">アカウントをお持ちでない方は</span>
        <a id="auth-switch-link">新規登録</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ─── ログアウトボタン ───
  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'firebase-logout-btn';
  logoutBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
    ログアウト
  `;
  document.body.appendChild(logoutBtn);

  // ─── DOM参照 ───
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const confirmInput = document.getElementById('auth-confirm');
  const confirmGroup = document.getElementById('auth-confirm-group');
  const submitBtn = document.getElementById('auth-submit');
  const switchLink = document.getElementById('auth-switch-link');
  const switchText = document.getElementById('auth-switch-text');
  const subtitleEl = document.getElementById('auth-subtitle');
  const errorEl = document.getElementById('auth-error');

  let isSignUp = false;

  // ─── エラー表示 ───
  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }
  function hideError() {
    errorEl.classList.remove('visible');
  }

  // ─── Firebaseエラーメッセージの日本語化 ───
  function translateError(code) {
    const map = {
      'auth/email-already-in-use': 'このメールアドレスは既に使用されています。',
      'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
      'auth/operation-not-allowed': 'この認証方法は現在無効になっています。',
      'auth/weak-password': 'パスワードは6文字以上にしてください。',
      'auth/user-disabled': 'このアカウントは無効化されています。',
      'auth/user-not-found': 'メールアドレスまたはパスワードが間違っています。',
      'auth/wrong-password': 'メールアドレスまたはパスワードが間違っています。',
      'auth/invalid-credential': 'メールアドレスまたはパスワードが間違っています。',
      'auth/too-many-requests': 'ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。',
      'auth/network-request-failed': 'ネットワークエラーが発生しました。接続を確認してください。',
    };
    return map[code] || 'エラーが発生しました。もう一度お試しください。';
  }

  // ─── モード切り替え ───
  function toggleMode() {
    isSignUp = !isSignUp;
    hideError();
    if (isSignUp) {
      subtitleEl.textContent = '新しいアカウントを作成';
      confirmGroup.style.display = 'block';
      submitBtn.textContent = '新規登録';
      switchText.textContent = '既にアカウントをお持ちの方は';
      switchLink.textContent = 'ログイン';
      passwordInput.autocomplete = 'new-password';
    } else {
      subtitleEl.textContent = 'アカウントにログイン';
      confirmGroup.style.display = 'none';
      submitBtn.textContent = 'ログイン';
      switchText.textContent = 'アカウントをお持ちでない方は';
      switchLink.textContent = '新規登録';
      passwordInput.autocomplete = 'current-password';
    }
  }

  switchLink.addEventListener('click', toggleMode);

  // ─── 送信処理 ───
  async function handleSubmit() {
    hideError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) { showError('メールアドレスを入力してください。'); return; }
    if (!password) { showError('パスワードを入力してください。'); return; }

    if (isSignUp) {
      const confirm = confirmInput.value;
      if (password !== confirm) { showError('パスワードが一致しません。'); return; }
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="auth-loading"></span>' + (isSignUp ? '登録中...' : 'ログイン中...');

    try {
      if (isSignUp) {
        await auth.createUserWithEmailAndPassword(email, password);
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
      // onAuthStateChanged が発火して UI を閉じる
    } catch (err) {
      console.error('[Auth]', err);
      showError(translateError(err.code));
      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? '新規登録' : 'ログイン';
    }
  }

  submitBtn.addEventListener('click', handleSubmit);

  // Enter キーで送信
  [emailInput, passwordInput, confirmInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
  });

  // ─── ログアウト ───
  logoutBtn.addEventListener('click', async () => {
    if (confirm('ログアウトしますか？')) {
      try {
        await auth.signOut();
        // localStorage をクリア（ユーザーデータを残さない）
        ['subjects', 'achievements', 'reviews'].forEach(key => {
          localStorage.removeItem(key);
        });
        location.reload();
      } catch (err) {
        console.error('[Auth] ログアウトエラー:', err);
      }
    }
  });

  // ─── 認証状態の監視 ───
  // FirebaseBridge 側で onAuthStateChanged を使うため、
  // ここでは UI の表示/非表示だけ管理する
  window.__firebaseAuthUI = {
    showLogin: function () {
      loadingEl.style.display = 'none';
      overlay.style.display = 'flex';
      overlay.classList.remove('fade-out');
      logoutBtn.style.display = 'none';
      emailInput.value = '';
      passwordInput.value = '';
      confirmInput.value = '';
      hideError();
    },
    hideLogin: function () {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 400);
      logoutBtn.style.display = 'flex';
    },
    hideLoading: function () {
      loadingEl.style.display = 'none';
    }
  };

  console.log('[AuthUI] 初期化完了');
})();
