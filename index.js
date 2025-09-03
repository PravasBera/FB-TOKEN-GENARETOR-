import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs-extra";

dotenv.config();
const app = express();

const { FB_APP_ID, FB_APP_SECRET, REDIRECT_URI } = process.env;

// Helper → save tokens to file
async function saveToken(userId, token) {
  let data = {};
  if (await fs.pathExists("tokens.json")) {
    data = JSON.parse(await fs.readFile("tokens.json"));
  }
  data[userId] = token;
  await fs.writeFile("tokens.json", JSON.stringify(data, null, 2));
}

// Root route → homepage
app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 FB Token Generator</h1>
    <p>Click below to login and generate token:</p>
    <a href="/login">🔑 Login with Facebook</a>
  `);
});

// Step 1 → Login route
app.get("/login", (req, res) => {
  const scopes = [
    "pages_show_list",
    "pages_manage_posts",
    "pages_manage_engagement",
    "pages_read_engagement",
    "pages_messaging",
    "email"
  ].join(",");

  const url =
    `https://www.facebook.com/v17.0/dialog/oauth?` +
    `client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${scopes}&response_type=code`;

  res.redirect(url);
});

// Step 2 → Callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No code returned.");

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v17.0/oauth/access_token?` +
        `client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&client_secret=${FB_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      // Get user ID
      const meRes = await fetch(
        `https://graph.facebook.com/me?access_token=${tokenData.access_token}`
      );
      const me = await meRes.json();

      // Save token by user ID
      await saveToken(me.id, tokenData.access_token);

      res.send(`
        <h2>✅ Token Generated for ${me.name}</h2>
        <p>User ID: ${me.id}</p>
        <textarea cols="80" rows="5">${tokenData.access_token}</textarea>
        <br/><br/>
        <a href="/tokens">📂 See All Saved Tokens</a>
      `);
    } else {
      res.json(tokenData);
    }
  } catch (e) {
    res.json({ error: e.message });
  }
});

// See all tokens
app.get("/tokens", async (req, res) => {
  if (await fs.pathExists("tokens.json")) {
    const data = JSON.parse(await fs.readFile("tokens.json"));
    res.json(data);
  } else {
    res.json({ message: "❌ No tokens saved yet." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
