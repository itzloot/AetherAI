const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatArea = document.getElementById("chatArea");
const signInScreen = document.getElementById("signInScreen");
const mainApp = document.getElementById("mainApp");
const sidebar = document.getElementById("sidebar");
const historyBtn = document.getElementById("historyBtn");

let currentUser = null;
let chats = [];
let currentChatId = null;
let isPro = false;

const MAX_IMAGES_FREE = 5;
const MAX_MESSAGES_FREE = 25;

// Firebase Auth
firebase.auth().onAuthStateChanged((user) => {
  currentUser = user;

  if (user) {
    signInScreen.classList.remove("active");
    mainApp.classList.add("active");

    document.getElementById("userDisplay").innerHTML = `
      <span>${user.displayName || user.email.split('@')[0]}</span>
      <button id="signOutBtn" class="icon-btn">✖</button>
    `;
    document.getElementById("signOutBtn").onclick = () => firebase.auth().signOut();

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();

    loadData();
  } else {
    signInScreen.classList.add("active");
    mainApp.classList.remove("active");

    // Re-attach sign in button click (critical fix)
    const signInBtn = document.getElementById("googleSignInBtn");
    if (signInBtn) {
      signInBtn.onclick = null; // clear any old listener
      signInBtn.onclick = () => {
        console.log("Sign in button clicked!");
        firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
          .then((result) => {
            console.log("Signed in:", result.user.displayName);
          })
          .catch((error) => {
            console.error("Sign in error:", error);
            alert("Sign in failed: " + error.message + "\nTry allowing popups");
          });
      };
    }

    input.disabled = true;
    sendBtn.disabled = true;
    chatArea.innerHTML = "";
    sidebar.style.left = "-320px";
  }
});

// Load saved data
function loadData() {
  const saved = localStorage.getItem("aetherai_chats");
  if (saved) {
    chats = JSON.parse(saved);
    isPro = localStorage.getItem("aetherai_pro") === "true";
    if (chats.length > 0) {
      loadChat(chats[0].id);
    } else {
      newChat();
    }
  } else {
    newChat();
  }
  updateSidebar();
  updateProStatus();
}

// New chat
function newChat() {
  const id = Date.now();
  chats.unshift({
    id,
    topic: "New Conversation",
    messages: [],
    imageCount: 0,
    messageCount: 0
  });
  loadChat(id);
  saveAll();
  updateSidebar();
}

// Load chat
function loadChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  chatArea.innerHTML = "";
  chat.messages.forEach(m => {
    const div = document.createElement("div");
    div.className = `message ${m.type}`;
    div.innerHTML = m.content;
    chatArea.appendChild(div);
  });
  chatArea.scrollTop = chatArea.scrollHeight;
  updateSidebar();
}

// Update sidebar
function updateSidebar() {
  const list = document.getElementById("chatList");
  list.innerHTML = "";
  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-item";
    if (chat.id === currentChatId) item.classList.add("active");
    item.textContent = chat.topic || "New Conversation";
    item.onclick = () => loadChat(chat.id);
    list.appendChild(item);
  });
}

// Save all
function saveAll() {
  localStorage.setItem("aetherai_chats", JSON.stringify(chats));
  localStorage.setItem("aetherai_pro", isPro);
}

// Pro status (add your Pro UI if needed)
function updateProStatus() {
  // Optional: add Pro badge here
}

// Unlock Pro (your secure API)
async function unlockPro() {
  const code = prompt("Enter your AetherAI Pro giveaway code:");
  if (!code) return;

  try {
    const res = await fetch("/api/pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const data = await res.json();

    if (data.valid) {
      isPro = true;
      updateProStatus();
      saveAll();
      addMessage("🎉 PRO UNLOCKED! Unlimited everything 🔥", "bot");
    } else {
      addMessage("Invalid code 😔 Join Discord for giveaways: https://discord.gg/kxyFtrh9Ya", "bot");
    }
  } catch {
    addMessage("Error checking code — try again!", "bot");
  }
}

// Pro button (optional)
if (!isPro) {
  const header = document.querySelector('header');
  const btn = document.createElement('button');
  btn.textContent = "Win Pro 🎁";
  btn.style.margin = "15px auto";
  btn.style.display = "block";
  btn.style.padding = "14px 28px";
  btn.style.background = "linear-gradient(135deg, #FFD700, #FFA500)";
  btn.style.color = "black";
  btn.style.border = "none";
  btn.style.borderRadius = "30px";
  btn.style.fontWeight = "bold";
  btn.style.fontSize = "18px";
  btn.style.cursor = "pointer";
  btn.onclick = unlockPro;
  header.appendChild(btn);
}

function addMessage(content, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;

  if (content instanceof HTMLImageElement) {
    content.alt = "Generated by AetherAI" + (isPro ? " Pro 🔥" : "");
    content.loading = "lazy";
    content.style.maxWidth = "100%";
    content.style.borderRadius = "16px";
    content.style.marginTop = "10px";
    div.appendChild(content);
  } else if (typeof content === "string") {
    if (content.startsWith("http") || content.startsWith("data:image")) {
      const img = document.createElement("img");
      img.src = content;
      img.alt = "Generated by AetherAI" + (isPro ? " Pro 🔥" : "");
      img.loading = "lazy";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "16px";
      img.style.marginTop = "10px";
      div.appendChild(img);
    } else {
      if (isPro && type === "bot" && Math.random() < 0.4) {
        content += " (AetherAI Pro 🔥)";
      }
      div.innerText = content;
    }
  }

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;

  const current = chats.find(c => c.id === currentChatId);
  if (current) {
    current.messages.push({ content: div.innerHTML, type });
    if (current.messages.length === 2 && type === "user") {
      current.topic = content.substring(0, 40) + (content.length > 40 ? "..." : "");
      updateSidebar();
    }
    saveAll();
  }
}

async function sendMessage() {
  if (!currentUser) {
    addMessage("Sign in with Google to chat and generate images!", "bot");
    return;
  }

  const text = input.value.trim();
  if (!text) return;

  const current = chats.find(c => c.id === currentChatId);
  if (!current) return;

  if (!isPro && current.messageCount >= MAX_MESSAGES_FREE) {
    addMessage(`Message limit reached. Win Pro in Discord!`, "bot");
    return;
  }

  addMessage(text, "user");
  input.value = "";
  current.messageCount++;

  const lowerText = text.toLowerCase();
  const isImageRequest = /generate|create|draw|image|picture|logo/i.test(lowerText);

  if (isImageRequest) {
    if (!isPro && current.imageCount >= MAX_IMAGES_FREE) {
      addMessage(`Image limit reached. Win Pro in Discord!`, "bot");
      return;
    }

    const loading = document.createElement("div");
    loading.className = "message bot";
    loading.innerText = "Generating with FLUX... 🔥";
    chatArea.appendChild(loading);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
      const img = await puter.ai.txt2img(text, { model: "black-forest-labs/FLUX.1-schnell" });
      chatArea.removeChild(loading);
      addMessage(img, "bot");
      current.imageCount++;
    } catch {
      chatArea.removeChild(loading);
      addMessage("Generation failed — try again!", "bot");
    }
  } else {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.concat({ role: "user", content: text }) })
      });

      const data = await res.json();
      addMessage(data.reply, "bot");

    } catch {
      addMessage("Chat error — check connection!", "bot");
    }
  }

  saveAll();
}

sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

input.focus();
// Handle Firebase auth redirect result (fixes white flash and return to sign in)
firebase.auth().getRedirectResult()
  .then((result) => {
    if (result.credential) {
      // Successful sign in
      console.log("Signed in via redirect");
    }
  })
  .catch((error) => {
    console.error("Redirect error:", error);
  });

// Use popup instead of redirect (better for Vercel)
const signInBtn = document.getElementById("googleSignInBtn");
if (signInBtn) {
  signInBtn.onclick = () => {
    firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then((result) => {
        console.log("Signed in:", result.user.displayName);
      })
      .catch((error) => {
        console.error("Popup error:", error);
        alert("Sign in failed: " + error.message + "\nTry allowing popups for this site");
      });
  };
}