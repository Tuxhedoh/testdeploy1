<div align="center">
<img width="1200" height="475" alt="MemeGenie AI Banner" src="public/ghbanner.png" />

# 🧞‍♂️ MemeGenie AI 2.0

**Your AI-powered meme production studio.** 
Transform ideas into viral content with advanced Gemini-powered features.
</div>

---

## ✨ Features

- **🪄 Magic Caption**: Upload an image and let Gemini Pro Vision analyze it to suggest up to 5 hilarious, context-aware captions in your choice of tone (Sarcastic, Wholesome, Gen-Z, etc.).
- **💭 Dream Generate**: Describe a scene in natural language, and Gemini Flash will generate a high-resolution, meme-worthy background for you.
- **🎨 AI Image Transform**: Edit your meme backgrounds using text prompts. "Add sunglasses", "Make it Noir", or "Add a cyberpunk glow" with just a few words.
- **🖼️ Customizable Formats**: Choose between Classic, Modern, and Demotivational meme layouts.
- **✍️ Professional Editor**: Full control over typography (Comic Sans, Impact, etc.), font size, text position, and colors.
- **💾 Local Gallery**: Save your best creations to a local gallery (stored in your browser) to revisit or download later.
- **↩️ Undo/Redo**: Full history support with keyboard shortcuts (Ctrl+Z / Ctrl+Y).

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Tuxhedoh/memegenie-ai.git
    cd memegenie-ai
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env.local` file in the root directory and add your Gemini API key:
    ```bash
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide Icons
- **AI Engine**: 
  - `gemini-3-pro-preview` for caption analysis and suggestion.
  - `gemini-2.5-flash-image` for background generation and image editing.
- **Storage**: Browser LocalStorage for the meme gallery.

---

<p align="center">
MemeGenie AI &copy; 2025 Creative Intelligence
</p>
