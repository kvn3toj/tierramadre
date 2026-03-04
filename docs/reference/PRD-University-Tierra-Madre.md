# PRD: University Tierra Madre

**App Name:** University Tierra Madre
**Type:** Standalone subapp (separate from Tierra Madre Studio)
**Author:** Tierra Madre Team
**Date:** February 28, 2026
**Status:** Draft v2

---

## Problem Statement

Tierra Madre's ambassadors (asesores) need to develop deep knowledge about Colombian emeralds — origins, quality grades, cuts, color classifications, pricing factors, and selling techniques — to be effective salespeople. Today there's no structured way to train ambassadors or verify what they know. This leads to inconsistent product knowledge across the team, missed sales opportunities when ambassadors can't answer buyer questions confidently, and no visibility into which ambassadors are ready to represent the brand.

## Goals

1. **Build a quiz platform, not just a quiz**: Create a Kahoot-style platform where admins can create, edit, and manage multiple quiz games — not a single hardcoded questionnaire
2. **Make learning addictive**: Points, levels, streaks, and leaderboards should make ambassadors want to come back and play again — the reward is knowledge and the thrill of the game
3. **Support diverse question types**: Go beyond multiple choice — true/false, image identification, ordering, and more to test different kinds of emerald knowledge
4. **Identify knowledge gaps**: Surface which topic areas and question types ambassadors struggle with most, so training can be targeted
5. **Enable both solo practice and live group events**: Support individual self-paced play and live hosted sessions (Kahoot-style) for team events or onboarding

## Non-Goals

- **Not integrated into the main Tierra Madre Studio app** — this is a standalone subapp with its own URL and deployment. Integration may come later.
- **No user accounts or authentication for v1** — ambassadors enter their name/nickname to play. Full auth (linking to Tierra Madre ambassador profiles) is a future consideration.
- **No real money or prizes** — the reward is knowledge, points, and leveling up. No cash, gift cards, or material incentives.
- **No video questions for v1** — text and image-based questions only. Video questions (e.g., "identify this emerald's quality from a video clip") are future scope.
- **No monetization or public access** — this is an internal training tool for Tierra Madre ambassadors only.

---

## User Stories

### Ambassador (Player)

- As an ambassador, I want to browse available quizzes so that I can choose which topic to practice
- As an ambassador, I want to play a quiz solo at my own pace so that I can practice whenever I have free time
- As an ambassador, I want to earn points for correct answers (with bonus points for speed) so that I feel rewarded and motivated
- As an ambassador, I want to see my current level and XP progress so that I have a sense of long-term achievement
- As an ambassador, I want to see the correct answer with an explanation after each question so that I actually learn from the experience
- As an ambassador, I want to see a results summary at the end showing my score, accuracy, and which questions I missed so that I know what to study
- As an ambassador, I want to join a live game session using a code so that I can compete with other ambassadors in real-time
- As an ambassador, I want to see a leaderboard during live sessions so that the competition keeps me engaged

### Host (Live Session)

- As a host, I want to select a quiz and launch a live session with a join code so that ambassadors can play together from their phones
- As a host, I want to display questions on a shared screen while players answer on their devices so that we have the Kahoot group experience
- As a host, I want to see a real-time scoreboard between questions so that the group stays competitive and energized
- As a host, I want to control the pace (next question, pause, skip) so that I can manage the flow of the session
- As a host, I want to see session results and export them so that I can track which ambassadors participated and how they performed

### Admin (Quiz Creator)

- As an admin, I want to create a new quiz with a title, description, category, and cover image so that I can organize quizzes by topic
- As an admin, I want to add different types of questions to a quiz (multiple choice, true/false, image identification, ordering) so that I can test different kinds of knowledge
- As an admin, I want to set a difficulty level and point value for each question so that harder questions reward more points
- As an admin, I want to set a time limit per question so that I can control the pace and pressure
- As an admin, I want to edit existing quizzes and questions so that I can fix mistakes or update content
- As an admin, I want to duplicate a quiz so that I can create variations without starting from scratch
- As an admin, I want to preview a quiz before publishing so that I can verify it works correctly
- As an admin, I want to mark quizzes as draft/published/archived so that I control what ambassadors can see
- As an admin, I want to manage all this through Google Sheets so that I don't need a separate admin panel for v1

---

## Requirements

### Must-Have (P0) — Quiz Platform Core

**Q1: Google Sheets Quiz & Question Bank**
- **Quizzes sheet**: Each row is a quiz with columns: `quizId`, `title`, `description`, `category`, `coverImageUrl`, `difficulty` (Beginner/Intermediate/Expert), `timePerQuestion` (seconds), `status` (draft/published/archived), `createdDate`, `questionCount`
- **Questions sheet**: Each row is a question with columns: `questionId`, `quizId`, `type` (multiple-choice/true-false/image-id/ordering), `questionText`, `imageUrl`, `optionA`, `optionB`, `optionC`, `optionD`, `correctAnswer`, `explanation`, `points`, `order`, `active`
- API endpoints to fetch quizzes and their questions
- Acceptance criteria:
  - [ ] Quizzes sheet created with sample quizzes (minimum 3 different quizzes)
  - [ ] Questions sheet created with minimum 10 questions per sample quiz
  - [ ] API returns only published quizzes to players
  - [ ] API returns draft + published quizzes to admin
  - [ ] Questions filtered by `active = TRUE` and ordered by `order` column
  - [ ] Multiple question types are supported in the data model

**Q2: Quiz Browser (Home Screen)**
- Grid/card layout showing available published quizzes
- Each card shows: title, cover image, category, difficulty badge, question count, estimated play time
- Filter by category and difficulty
- Search by title
- Acceptance criteria:
  - [ ] Published quizzes display as cards with all metadata
  - [ ] Draft/archived quizzes are hidden from players
  - [ ] Category filter works
  - [ ] Difficulty filter works (Beginner, Intermediate, Expert)
  - [ ] Search filters quiz titles in real-time
  - [ ] Mobile responsive (works on 360px screens)

**Q3: Multiple Question Types**
- **Multiple Choice (4 options)**: Classic Kahoot-style — one correct answer from four options, color-coded answer blocks (like Kahoot's red/blue/yellow/green diamonds)
- **True / False**: Two large buttons, fast-paced
- **Image Identification**: Shows an emerald image and asks to identify a quality (color grade, origin, cut type). Uses the `imageUrl` field.
- **Ordering / Ranking**: Given 4 items, arrange them in the correct order (e.g., "Rank these emerald grades from lowest to highest quality"). Player drags or taps to reorder.
- Acceptance criteria:
  - [ ] Multiple choice renders 4 color-coded answer blocks
  - [ ] True/false renders 2 large buttons
  - [ ] Image identification displays an image above the question with answer options below
  - [ ] Ordering shows 4 draggable/tappable items that can be rearranged
  - [ ] All types show correct answer + explanation after answering
  - [ ] All types award points correctly

**Q4: Points & Levels System (replaces money prizes)**

**Points per question:**
- Base points for correct answer: 1000
- Speed bonus: up to +500 extra points (linear decay from full bonus at instant answer to 0 at time limit)
- Streak bonus: consecutive correct answers multiply points (x1.0, x1.2, x1.5, x2.0 for 1, 2, 3, 4+ streak)
- Wrong answer: 0 points, streak resets

**Levels (XP-based progression):**

| Level | Title | XP Required | Cumulative |
|-------|-------|-------------|------------|
| 1 | Aprendiz (Apprentice) | 0 | 0 |
| 2 | Buscador (Seeker) | 5,000 | 5,000 |
| 3 | Conocedor (Connoisseur) | 10,000 | 15,000 |
| 4 | Experto (Expert) | 20,000 | 35,000 |
| 5 | Maestro Esmeralda (Emerald Master) | 35,000 | 70,000 |

- XP = total points earned across all quizzes (persisted in localStorage for v1)
- Level and XP shown in a header bar during gameplay and on the home screen
- Level-up animation when a player crosses a threshold

- Acceptance criteria:
  - [ ] Points calculated correctly: base (1000) + speed bonus (0-500) + streak multiplier
  - [ ] Streak counter visible during gameplay, resets on wrong answer
  - [ ] Speed bonus decreases linearly as time runs out
  - [ ] Total XP persisted in localStorage
  - [ ] Current level and progress bar shown on home screen and during play
  - [ ] Level-up triggers a celebratory animation/effect
  - [ ] No money, prizes, or financial metaphors anywhere in the UI

**Q5: Solo Game Flow**
- Player selects a quiz from the browser
- Pre-game screen shows quiz info: title, description, question count, estimated time, difficulty
- "Start" begins the quiz — questions appear one at a time
- Timer counts down per question (configurable per quiz via the `timePerQuestion` field)
- After answering: brief feedback (correct/wrong + explanation + points earned), then auto-advance
- After the last question: results summary screen
- Acceptance criteria:
  - [ ] Pre-game screen shows all quiz metadata and a "Start" button
  - [ ] Questions appear one at a time with a countdown timer
  - [ ] Answering shows immediate feedback (green flash for correct, red for wrong)
  - [ ] Explanation displays after each question
  - [ ] Points and streak are visible during gameplay
  - [ ] Auto-advance to next question after 2-3 seconds of feedback

**Q6: Results Screen**
- Total score (points earned this quiz)
- Accuracy percentage
- Questions breakdown: correct vs. incorrect, per-question detail
- For wrong answers: show correct answer and explanation
- XP gained and level progress update
- "Play Again" and "Back to Quizzes" buttons
- Share score option (copy text for WhatsApp)
- Acceptance criteria:
  - [ ] Total score displayed prominently
  - [ ] Accuracy shown as percentage and fraction (e.g., "8/10 — 80%")
  - [ ] Each question listed with player's answer, correct answer, and explanation
  - [ ] XP bar animates to show new progress
  - [ ] "Play Again" reshuffles question order for variety
  - [ ] "Share" generates a copy-pasteable text (e.g., "I scored 8,500 points on 'Origins of Colombian Emeralds' — Level 3 Conocedor!")

**Q7: Visual Design — Kahoot-Inspired Emerald Theme**
- Vibrant, energetic UI inspired by Kahoot's playful design
- Emerald green primary (#00C853 family) with gold accents, dark backgrounds
- Color-coded answer blocks: 4 distinct colors for multiple choice (like Kahoot's iconic red/blue/yellow/green)
- Geometric shapes in answer blocks (diamond, emerald-cut hexagon, triangle, circle) for visual distinction
- Fun animations: answer reveal, correct/wrong feedback, streak counter, level-up celebration
- Tierra Madre branding: logo in header, "University Tierra Madre" wordmark
- Mobile-first responsive design
- Acceptance criteria:
  - [ ] Works on mobile screens (360px minimum width)
  - [ ] Kahoot-style color-coded answer blocks with geometric shapes
  - [ ] Dark background with emerald green and gold accents
  - [ ] Answer feedback animations (flash green/red, show points)
  - [ ] Streak counter animates on consecutive correct answers
  - [ ] Tierra Madre logo and branding present
  - [ ] Touch targets minimum 48px for all interactive elements

### Nice-to-Have (P1) — Live Hosted Mode

**Q8: Game Room & Lobby**
- Host selects a quiz and creates a live session
- System generates a 6-digit join code
- Players enter the code on their phone to join the lobby
- Lobby screen shows player nicknames and avatars (emoji picker)
- Host sees all joined players and clicks "Start" when ready
- Real-time communication via polling (upgrade to WebSocket later if needed)
- Acceptance criteria:
  - [ ] Host can select any published quiz to launch a live session
  - [ ] 6-digit alphanumeric code generated and displayed prominently
  - [ ] Players can join by entering the code (no auth required, just nickname)
  - [ ] Lobby updates in real-time showing joined players
  - [ ] Host has a "Start Game" button that becomes active with 2+ players
  - [ ] Players see a "Waiting for host..." screen after joining

**Q9: Synchronized Live Gameplay**
- Host screen (projected): shows question text, image, timer countdown, and answer distribution after everyone answers
- Player screen (phone): shows answer options only (Kahoot-style — options are big, colorful, tap-friendly)
- Timer per question (configurable by host: 10s, 15s, 20s, 30s)
- Points awarded by correctness and speed (same formula as solo mode)
- Scoreboard shown between every question: top 5 players with scores, each player sees their own rank
- Acceptance criteria:
  - [ ] Host screen designed for projection (large text, high contrast)
  - [ ] Player screen shows only answer options (no question text — they look at the host screen)
  - [ ] Timer syncs between host and players
  - [ ] Points awarded correctly with speed bonus
  - [ ] Scoreboard animates between questions showing rank changes
  - [ ] Late answers (after timer) are not accepted

**Q10: Session Results & Export**
- Final podium: top 3 players with scores and celebratory animation
- Full leaderboard with all players
- Per-player breakdown of correct/incorrect answers
- Host can export results to Google Sheets (new row per session with player scores)
- Acceptance criteria:
  - [ ] Podium animation for top 3 (gold, silver, bronze)
  - [ ] Complete leaderboard visible to all players
  - [ ] Host can click "Export to Sheets" to save results
  - [ ] Export includes: session date, quiz name, player names, scores, accuracy

### Nice-to-Have (P1) — In-App Quiz Editor

**Q11: Quiz Creator UI**
- Admin panel accessible via a `/admin` route (simple password protection for v1)
- Create new quiz: title, description, category, cover image URL, difficulty, time per question
- Add questions to a quiz: select type, enter text, options, correct answer, explanation, image URL, points
- Reorder questions via drag-and-drop
- Preview quiz before publishing
- Set quiz status: draft → published → archived
- Acceptance criteria:
  - [ ] `/admin` route protected by a simple password (stored in env variable)
  - [ ] Create quiz form with all fields
  - [ ] Add question form adapts based on selected question type
  - [ ] Questions can be reordered
  - [ ] Preview mode plays through the quiz as a player would see it
  - [ ] Status toggle: draft/published/archived
  - [ ] All changes save directly to Google Sheets

*Note: For v1, admins can also edit quizzes directly in Google Sheets. The in-app editor is a convenience layer on top of the same data.*

### Future Considerations (P2)

- **Ambassador profile integration**: Link quiz results to Tierra Madre ambassador profiles, track progress over time
- **Persistent leaderboards**: All-time rankings stored in Google Sheets, viewable on the home screen
- **Certification system**: Ambassadors who complete all quizzes in a category earn a badge (e.g., "Certified in Emerald Origins")
- **Video questions**: Show a video clip and ask questions about what they see
- **Team mode**: Groups of ambassadors compete as teams, combining scores
- **Timed challenge mode**: Daily/weekly challenges with a set of random questions and a global leaderboard
- **Analytics dashboard**: Track which categories, question types, and difficulty levels have the lowest correct-answer rates across all ambassadors
- **Multi-language support**: Spanish and English (matching Tierra Madre's i18n setup)
- **Question import from CSV**: Bulk upload questions instead of one-by-one entry

---

## Technical Considerations

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + MUI v6 (same as Tierra Madre Studio)
- **Backend**: Google Sheets API via Vercel serverless functions (same pattern as `get-treasure-sheets`)
- **State**: localStorage for XP/level persistence (v1), Google Sheets for quiz data
- **Real-time (P1)**: Polling initially, WebSocket upgrade later if needed
- **Deployment**: Vercel (separate project from Tierra Madre Studio, e.g., `university-tierra-madre.vercel.app`)
- **Development**: localhost first (`npm run dev` on port 3001 to avoid conflict with Tierra Madre on 3000)

### Google Sheets Structure

**Sheet: "Quizzes"**

| Column | Type | Description |
|--------|------|-------------|
| quizId | string | Unique quiz identifier (e.g., "origins-101") |
| title | string | Quiz display name (e.g., "Origins of Colombian Emeralds") |
| description | string | Short description shown on the quiz card |
| category | string | Topic category (Origins, Color, Clarity, Cut, Pricing, History, Selling) |
| coverImageUrl | string | URL for the quiz card cover image |
| difficulty | string | Beginner / Intermediate / Expert |
| timePerQuestion | number | Default seconds per question (10, 15, 20, 30) |
| status | string | draft / published / archived |
| createdDate | date | When the quiz was created |
| questionCount | number | Auto-calculated or manually maintained |

**Sheet: "Questions"**

| Column | Type | Description |
|--------|------|-------------|
| questionId | string | Unique question ID |
| quizId | string | Links to the Quizzes sheet |
| type | string | multiple-choice / true-false / image-id / ordering |
| questionText | string | The question text |
| imageUrl | string | Optional image URL (required for image-id type) |
| optionA | string | First option |
| optionB | string | Second option |
| optionC | string | Third option (blank for true-false) |
| optionD | string | Fourth option (blank for true-false) |
| correctAnswer | string | "A"/"B"/"C"/"D" for MC; "A"/"B" for T/F; "A,C,B,D" for ordering (correct sequence) |
| explanation | string | Why this is the correct answer |
| points | number | Base points for this question (default 1000) |
| order | number | Display order within the quiz |
| active | boolean | TRUE/FALSE |

**Sheet: "Results" (for tracking)**

| Column | Type | Description |
|--------|------|-------------|
| resultId | string | Unique result ID |
| quizId | string | Which quiz was played |
| playerName | string | Player's nickname |
| score | number | Total points earned |
| accuracy | number | Percentage correct (0-100) |
| questionsCorrect | number | Number of correct answers |
| questionsTotal | number | Total questions in quiz |
| date | date | When the quiz was played |
| mode | string | solo / live |
| sessionCode | string | Live session code (blank for solo) |

**Sheet: "LiveSessions" (P1)**

| Column | Type | Description |
|--------|------|-------------|
| sessionCode | string | 6-digit join code |
| quizId | string | Which quiz is being played |
| hostName | string | Who created the session |
| status | string | lobby / playing / finished |
| playerCount | number | Number of players |
| createdDate | datetime | When the session was created |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/quizzes` | GET | List published quizzes (or all for admin) |
| `/api/quizzes/[id]` | GET | Get a single quiz with its questions |
| `/api/quizzes` | POST | Create a new quiz (admin) |
| `/api/quizzes/[id]` | PUT | Update a quiz (admin) |
| `/api/questions` | POST | Add a question to a quiz (admin) |
| `/api/questions/[id]` | PUT | Update a question (admin) |
| `/api/results` | POST | Save a game result |
| `/api/results` | GET | Get results (filterable by quiz, player, date) |
| `/api/live/create` (P1) | POST | Create a live session |
| `/api/live/[code]` (P1) | GET | Get live session state |
| `/api/live/[code]/join` (P1) | POST | Join a live session |
| `/api/live/[code]/answer` (P1) | POST | Submit an answer in a live session |
| `/api/live/[code]/next` (P1) | POST | Host advances to next question |

### Key Design Decisions

- **Platform, not a single quiz**: The core architecture supports multiple quizzes, each with their own questions, difficulty, and configuration. This makes the app reusable and scalable as new training topics arise.
- **Google Sheets as backend**: Consistent with Tierra Madre's architecture. Quizzes and questions are easy to edit in a spreadsheet. Admins who are comfortable with Sheets can bypass the in-app editor entirely. Cache on client after initial fetch for performance.
- **Points and XP instead of money**: The gamification is intrinsic — knowledge, levels, and competition are the reward. No financial metaphors that could confuse ambassadors or create wrong incentives.
- **Kahoot visual language**: Color-coded answer blocks, speed bonuses, streaks, and leaderboards create the same energy as Kahoot. Players should feel they're playing a game, not taking a test.
- **No auth for v1**: Ambassadors enter a nickname. XP is stored in localStorage (per device). This keeps v1 simple. When auth is added later, XP can be migrated to server-side storage.
- **Polling over WebSocket for P1**: Simpler to implement on Vercel serverless. If latency becomes an issue, upgrade to WebSocket via Ably, Pusher, or similar.
- **Separate Vercel project**: Keeps the subapp independent, with its own deployment pipeline and no risk of breaking the main Tierra Madre app.

### App Routes

| Route | Description |
|-------|-------------|
| `/` | Home — quiz browser with filters |
| `/quiz/[id]` | Pre-game screen for a specific quiz |
| `/quiz/[id]/play` | Active gameplay (solo mode) |
| `/quiz/[id]/results` | Results screen after completing a quiz |
| `/join` | Enter a live session code |
| `/live/[code]` | Live session player screen |
| `/host/[code]` | Live session host screen (P1) |
| `/admin` | Quiz creator and editor (P1) |

---

## Success Metrics

### Leading Indicators (first 2 weeks)
- **Quizzes played**: Target 50+ solo quiz completions in the first week across all ambassadors
- **Completion rate**: 70%+ of started quizzes are finished (not abandoned mid-quiz)
- **Replay rate**: 40%+ of players replay a quiz or try a different one
- **Question engagement**: Average time per question > 8 seconds (not just randomly tapping)
- **Level progression**: 50%+ of players reach Level 2 (Buscador) within the first week

### Lagging Indicators (first 2 months)
- **Knowledge improvement**: Average accuracy increases over repeated plays of the same quiz
- **Category coverage**: Ambassadors attempt quizzes across 3+ different categories
- **Ambassador confidence**: Qualitative feedback that ambassadors feel more prepared for buyer questions
- **Live session adoption** (P1): At least 2 hosted sessions per month with 4+ participants
- **Quiz library growth**: At least 5 quizzes published within the first month

---

## Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | How many quizzes should we launch with? (Recommend 3-5 covering the core categories) | Content / Admin | Yes — need content before launch |
| 2 | How many questions per quiz is ideal? (Recommend 10-15 for solo, 15-20 for live) | Product | No — configurable per quiz |
| 3 | Should the timer be visible to the player, or hidden for less pressure? | Product | No — start visible, can adjust |
| 4 | For the ordering question type, should we support drag-and-drop on mobile, or use tap-to-reorder? | Engineering | No — can ship with tap-to-reorder first |
| 5 | Should the admin editor (Q11) be in-app or should we rely on Google Sheets editing for v1? | Product / Engineering | No — Sheets works for v1, editor is P1 |
| 6 | Do we want sound effects? They add energy but can be annoying on phones. | Product | No — ship with a toggle |
| 7 | Should XP and levels reset periodically (quarterly) or be permanent? | Product / Business | No — start permanent, revisit later |

---

## Timeline Considerations

### Phase 1: Quiz Platform Core (P0) — Solo Play
- **Estimated effort**: 3-4 weeks for one developer
- **Dependencies**: Google Sheets quiz/question bank must be populated with 3+ quizzes (30+ questions total)
- **Deliverables**: Quiz browser, solo gameplay with all 4 question types, points/XP/levels system, results screen
- **Milestone**: Playable on localhost with full Kahoot-style experience

### Phase 2: Polish & Deploy
- **Estimated effort**: 1 week
- **Tasks**: Responsive design polish, animations/transitions, sound effects toggle, Vercel deployment, Tierra Madre branding pass
- **Milestone**: Live at `university-tierra-madre.vercel.app`

### Phase 3: Live Hosted Mode + Admin Editor (P1)
- **Estimated effort**: 3-4 weeks
- **Dependencies**: Phase 1 complete, decision on real-time approach (polling vs. WebSocket)
- **Deliverables**: Live session creation, lobby, synchronized gameplay, scoreboard, podium, session export, in-app quiz editor
- **Milestone**: Host can create a room, players join and compete; admins can create quizzes in the app

---

## Sample Quizzes (Starter Set)

### Quiz 1: "Origins of Colombian Emeralds" (Beginner, 10 questions)

**Multiple Choice:**
> What country is the world's largest producer of emeralds?
> A) Brazil  B) Colombia  C) Zambia  D) Afghanistan
> *Correct: B — Colombia produces approximately 70-90% of the world's emeralds.*

**True / False:**
> The Muzo mine in Colombia has been producing emeralds for over 500 years.
> A) True  B) False
> *Correct: A — The Muzo mine has been a source of emeralds since pre-Columbian times, with indigenous peoples mining the area before Spanish colonization.*

**Image Identification:**
> [Photo of a Chivor emerald] Which Colombian mining region does this emerald most likely come from?
> A) Muzo  B) Chivor  C) Coscuez  D) La Pita
> *Correct: B — Chivor emeralds are known for their slightly bluish-green hue with exceptional clarity.*

**Ordering:**
> Rank these Colombian emerald mines from oldest to newest discovery:
> A) Chivor  B) La Pita  C) Muzo  D) Coscuez
> *Correct order: A, C, D, B — Chivor (pre-Columbian) → Muzo (1500s) → Coscuez (1900s) → La Pita (modern)*

### Quiz 2: "Color Grading Mastery" (Intermediate, 12 questions)

### Quiz 3: "The Art of Selling Emeralds" (Beginner, 10 questions)
