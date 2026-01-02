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

    document.getElementById("googleSignInBtn").onclick = () => {
      firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    };

    input.disabled = true;
    sendBtn.disabled = true;
    chatArea.innerHTML = "";
    sidebar.style.left = "-320px";
  }
});

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

function saveAll() {
  localStorage.setItem("aetherai_chats", JSON.stringify(chats));
  localStorage.setItem("aetherai_pro", isPro);
}

function updateProStatus() {
  // Add Pro UI if needed
}

async function sendMessage() {
  if (!currentUser) return;

  const text = input.value.trim();
  if (!text) return;

  const current = chats.find(c => c.id === currentChatId);
  if (!current) return;

  if (!isPro && current.messageCount >= MAX_MESSAGES_FREE) {
    addMessage("Message limit reached. Win Pro in Discord!", "bot");
    return;
  }

  addMessage(text, "user");
  input.value = "";
  current.messageCount++;

  const lowerText = text.toLowerCase();
  const isImageRequest = /generate|create|draw|image|picture|logo/i.test(lowerText);

  if (isImageRequest) {
    if (!isPro && current.imageCount >= MAX_IMAGES_FREE) {
      addMessage("Image limit reached. Win Pro in Discord!", "bot");
      return;
    }

    const loading = document.createElement("div");
    loading.className = "message bot";
    loading.innerText = "Generating with FLUX...";
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

function addMessage(content, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;

  if (content instanceof HTMLImageElement) {
    content.style.maxWidth = "100%";
    content.style.borderRadius = "16px";
    content.style.marginTop = "10px";
    div.appendChild(content);
  } else {
    div.innerText = content;
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

sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
// Attach sign in button click after auth state check
firebase.auth().onAuthStateChanged((user) => {
  // ... your existing code

  if (!user) {
    // Re-attach the button click every time (safe)
    const signInBtn = document.getElementById("googleSignInBtn");
    if (signInBtn) {
      signInBtn.onclick = () => {
        console.log("Sign in button clicked!"); // test if this logs
        firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
          .then((result) => {
            console.log("Signed in:", result.user);
          })
          .catch((error) => {
            console.error("Sign in error:", error);
            alert("Sign in failed: " + error.message);
          });
      };
    }
  }
});