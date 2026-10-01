# ✨ Lumina Notes — Aesthetic Study-Tech Mobile App

A beautifully crafted, performance-optimized, and production-ready private library app built strictly around visual aesthetics, calm UX philosophy, and secure AI utilities. 

> 📱 **The Smartphone Masterstroke:** 100% of this codebase, architecture, and deployment pipeline was engineered entirely on a 6-inch Android smartphone using Mobile IDEs, Termux, and GitHub—proving that resourcefulness always beats resources.

---

## 🚀 Key Architectural Breakthroughs (Under The Hood)

### 1. Paginated A4 Word-Boundary Engine (`PaginatedEditor.js`)
* Engineered a true multi-page document framework modeled after GoodNotes.
* Implemented a dynamic binary overflow handler tracking `onContentSizeChange` using estimated line-heights.
* Text automatically shifts to a newly spawned page on overflow, and backward reflows seamlessly when executing a backspace at position 0.

### 2. Bridge-Safe Native Rendering (`DrawModal.js`)
* Prevented JavaScript Bridge OOM (Out Of Memory) native crashes by eliminating raw JSON serialization of hundreds of SVG coordinate paths.
* Intercepted canvas interactions to stream data locally via `react-native-view-shot` and `expo-file-system`, safely broadcasting light URI pointers (~60 chars) across the bridge.

### 3. Biometric Vault & Background Timeout (`PrivacyGate.js`)
* Wrapped the full navigation hierarchy inside a fallback-enabled hardware verification gate using `expo-local-authentication`.
* Integrated an isolated state listener that triggers an absolute system auto-lock if the application remains backgrounded for more than 3000ms.

### 4. Viral Growth Loops (`StudygramShareModal.js`)
* Built a high-conversion micro-card engine with calculated dynamic color palettes mapping directly to the first character index of note titles.
* Integrated a standalone vector QR-Code generator directly inside the snapshot container to leverage organic user sharing into direct acquisition channels.

---

## 🛠️ The Tech Stack
* **Frontend:** React Native (Expo SDK 51), TypeScript/JS, Animated API, Context API
* **Backend Utilities:** Supabase Edge Functions (Secure Cloud API isolation)
* **Storage:** MongoDB Atlas (Mongoose Fail-Fast Connections) + AsyncStorage
* **AI Engine:** Google Gemini Pro / Flash Integration via secure cloud invokes
* 
