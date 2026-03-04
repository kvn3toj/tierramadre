# 🗺️ User Journeys & Task Flows

## 👤 User Personas

### Primary User: María (Emerald Dealer)
- **Age**: 35-50
- **Tech Savvy**: Medium
- **Goals**: Manage inventory, create catalogs, sell emeralds
- **Pain Points**: Manual inventory tracking, time-consuming catalog creation
- **Primary Devices**: iPhone 12+, iPad

### Secondary User: Carlos (Ambassador)
- **Age**: 25-40
- **Tech Savvy**: High
- **Goals**: Share emeralds on social media, connect with buyers
- **Pain Points**: Inconsistent content, hard to track commissions
- **Primary Devices**: iPhone, Instagram-focused

## 🎯 Core User Journeys

### Journey 1: Upload New Emerald
**User Goal**: Add a newly acquired emerald to inventory

```
START: Opens app (lands on Gallery)
  ↓
1. Tap "Upload" tab
  └─ IOSTabBar navigation
  └─ Haptic feedback

2. Arrives at Upload screen
  └─ IOSNavigationBar shows "Upload Emeralds"
  └─ IOSFilePicker displayed

3. Takes photo or selects file
  Option A: Tap "Camera" → Opens native camera
  Option B: Tap "Browse" → Opens file picker
  Option C: Drag & drop file (desktop)

4. AI analyzes image (3-5 seconds)
  └─ IOSProgress shows upload progress (0-100%)
  └─ AI generates 5 name suggestions
  └─ AI writes description

5. Selects name
  Option A: Tap one of 5 suggested names
  Option B: Tap "Refrescar" for new names
  Option C: Type custom name in text field

6. Fills details
  └─ Select category (4 button options)
  └─ Enter weight (optional)
  └─ Enter price (optional)
  └─ Enter lot code (optional)

7. Taps "Guardar Esmeralda"
  └─ Validation runs
  └─ Success toast appears
  └─ Auto-navigates to Gallery

END: New emerald appears in Gallery grid
  └─ Badge appears on Inventory tab (+1)
```

**Success Metrics**:
- Time to complete: < 60 seconds
- Completion rate: > 95%
- Error rate: < 5%

---

### Journey 2: Create Catalog PDF
**User Goal**: Generate professional catalog for WhatsApp sharing

```
START: Gallery or Inventory page
  ↓
1. Tap "More" tab
  └─ IOSMoreSheet slides up from bottom
  └─ Shows 7 tools with icons

2. Tap "Catalog" item
  └─ Navigation to /catalog
  └─ Sheet closes with animation

3. Arrives at Catalog screen
  └─ IOSNavigationBar shows "Catalog"
  └─ Empty catalog builder displayed

4. Selects emeralds
  └─ Browse inventory list
  └─ Tap checkboxes to select (multi-select)
  └─ Selected count badge updates

5. Configures catalog settings
  └─ Choose layout (grid/list)
  └─ Set columns (2/3/4)
  └─ Toggle "Include prices" (on/off)
  └─ Toggle "Include descriptions"
  └─ Upload/select logo (optional)

6. Preview catalog
  └─ Live preview updates as settings change
  └─ Navigate pages (if multi-page)
  └─ Tap "Edit" to adjust emerald order

7. Generates PDF
  └─ Tap "Generate PDF" button
  └─ IOSProgress shows generation (0-100%)
  └─ Success message appears

8. Shares catalog
  Option A: Tap "WhatsApp" → Share via WhatsApp
  Option B: Tap "Download" → Save to Files app
  Option C: Tap "Email" → Compose email

END: Catalog shared successfully
  └─ Returns to Catalog screen (can create another)
```

**Success Metrics**:
- Time to first PDF: < 3 minutes
- Share rate: > 80%
- Repeat usage: > 50% weekly

---

### Journey 3: Search & Filter Gallery
**User Goal**: Find specific emerald quickly

```
START: Gallery page
  ↓
1. Views Gallery
  └─ Large Navigation Bar with "Your Gallery"
  └─ Search and Filter icons visible

2. Option A: Search by name
  └─ Tap search icon (🔍)
  └─ IOSTextField appears (animated)
  └─ Types emerald name
  └─ Results filter in real-time
  └─ Tap result → View detail

3. Option B: Filter by criteria
  └─ Tap filter icon (⚙️)
  └─ Filter sheet slides up
  └─ Selects filters:
     ├─ Category (loose/ring/pendant/earrings)
     ├─ Status (available/sold/reserved)
     ├─ Price range (slider)
     └─ Weight range (slider)
  └─ Tap "Apply" button
  └─ Gallery updates with filtered results
  └─ Active filter chips appear

4. Views filtered results
  └─ Emerald grid shows only matching items
  └─ Count updates: "12 emeralds • $45,000 COP"

5. Clears filters
  Option A: Tap "X" on individual chip
  Option B: Tap "Clear All" button
  Option C: Tap filter icon → "Reset"

END: Returns to full gallery view
```

**Success Metrics**:
- Search time: < 10 seconds
- Filter usage: > 60% of sessions
- Filter clarity: < 2% support tickets

---

### Journey 4: Manage Inventory Item
**User Goal**: Update emerald details or mark as sold

```
START: Inventory page
  ↓
1. Views inventory
  └─ Large Navigation Bar: "Inventory"
  └─ List/table of all emeralds
  └─ Each row shows: thumbnail, name, price, status

2. Selects emerald to edit
  └─ Tap on emerald row
  └─ Detail modal slides up (full screen)

3. Views detail modal
  └─ Large emerald image/video
  └─ All metadata displayed
  └─ Action buttons at bottom:
     ├─ Edit (pencil icon)
     ├─ Mark as Sold (checkmark)
     ├─ Delete (trash icon)
     └─ Share (export icon)

4. Option A: Edit details
  └─ Tap "Edit" button
  └─ Fields become editable
  └─ IOSTextField components appear
  └─ Change name, weight, price, etc.
  └─ Tap "Save" → Updates inventory

5. Option B: Mark as sold
  └─ Tap "Mark as Sold" button
  └─ Confirmation dialog appears:
     "Mark 'Esmeralda Verde' as sold?"
  └─ Tap "Confirm"
  └─ Status badge updates to "Sold"
  └─ Badge on Inventory tab updates (-1 available)
  └─ Item moves to "Sold" filter

6. Option C: Delete emerald
  └─ Tap "Delete" button (destructive red)
  └─ Confirmation dialog:
     "Delete 'Esmeralda Verde'? This cannot be undone."
  └─ Tap "Delete" to confirm
  └─ Item removed from inventory
  └─ Toast: "Emerald deleted successfully"

END: Returns to Inventory list (updated)
```

**Success Metrics**:
- Edit time: < 30 seconds
- Delete prevention: < 1% accidental deletes
- Update success: > 99%

---

### Journey 5: Connect with Ambassador
**User Goal**: Contact an ambassador via WhatsApp

```
START: Ambassadors page
  ↓
1. Views ambassadors
  └─ Large Navigation Bar: "Ambassadors"
  └─ Grid of ambassador cards
  └─ Each shows: photo, name, bio snippet, location

2. Browses ambassadors
  └─ Scrolls through grid
  └─ Sees stats (emeralds sold, rating)
  └─ Identifies preferred ambassador

3. Taps ambassador card
  └─ Full profile modal opens
  └─ Animation: slide up from bottom

4. Views ambassador profile
  └─ Hero section: Large photo + name
  └─ Complete bio (expanded)
  └─ Gallery of emeralds (if shared)
  └─ Reviews/testimonials
  └─ Contact methods:
     ├─ WhatsApp button
     ├─ Email button
     ├─ Instagram button
     └─ Phone button

5. Initiates contact
  └─ Tap "WhatsApp" button
  └─ Opens WhatsApp with pre-filled message:
     "Hola [Name], me gustaría conocer más sobre
      tus esmeraldas en Tierra Madre."
  └─ Leaves app → WhatsApp external

END: Conversation starts in WhatsApp
  └─ User can return to app (modal still open)
  └─ Tap "X" to close profile
```

**Success Metrics**:
- Contact rate: > 40%
- WhatsApp preference: > 80%
- Return to app: > 90%

---

## 🔄 Common Navigation Patterns

### Pattern 1: Tab Switching
```
Any Page → Tap different tab → New page
  └─ IOSTabBar handles navigation
  └─ React Router updates URL
  └─ IOSNavigationBar title updates
  └─ Active tab icon changes color (emerald green)
  └─ Haptic feedback (if supported)
```

### Pattern 2: More Sheet Discovery
```
Any Page → Tap "More" → Sheet opens
  └─ Backdrop darkens (rgba(0,0,0,0.4))
  └─ Sheet slides up (spring animation)
  └─ Tap tool → Navigate → Sheet closes
  └─ Tap outside → Sheet closes (return to page)
```

### Pattern 3: Detail Modals
```
List Page → Tap item → Modal opens
  └─ Full-screen modal (iPhone)
  └─ Large modal (iPad)
  └─ Close button (X) top-right
  └─ Actions at bottom
  └─ Tap close or swipe down → Modal closes
```

### Pattern 4: Form Submission
```
Form Page → Fill fields → Tap "Save"
  └─ Validation runs (client-side)
  └─ Error states appear (if invalid)
  └─ Loading state (IOSButton shows spinner)
  └─ Success → Toast + Auto-navigate
  └─ Error → Alert card + Stay on page
```

## 📊 Journey Metrics Dashboard

### Key Performance Indicators (KPIs)

| Journey | Metric | Target | Current | Status |
|---------|--------|--------|---------|--------|
| Upload Emerald | Completion rate | 95% | - | 🟡 TBD |
| Upload Emerald | Avg time | 60s | - | 🟡 TBD |
| Create Catalog | Share rate | 80% | - | 🟡 TBD |
| Create Catalog | Repeat usage | 50%/week | - | 🟡 TBD |
| Search Gallery | Time to result | 10s | - | 🟡 TBD |
| Manage Inventory | Edit success | 99% | - | 🟡 TBD |
| Contact Ambassador | Contact rate | 40% | - | 🟡 TBD |

### User Satisfaction Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task Success Rate | > 90% | Post-task survey |
| Navigation Clarity | > 85% | "Did you find what you needed?" |
| Feature Discovery | > 60% | Usage of 8+ features in 30 days |
| Net Promoter Score (NPS) | > 50 | "How likely to recommend?" |

## 🎮 Gamification Journey

### Accomplishment Loop
```
1. Upload first emerald
   └─ Achievement toast: "First Emerald! 🎉"
   └─ Badge unlocked on profile

2. Upload 10 emeralds
   └─ Achievement: "Collector"
   └─ New feature unlocked: Batch upload

3. Create first catalog
   └─ Achievement: "Catalog Creator"
   └─ Catalog templates unlocked

4. Sell first emerald
   └─ Achievement: "First Sale! 💰"
   └─ Revenue tracking appears

5. Reach $1M COP inventory
   └─ Achievement: "Million Dollar Collection"
   └─ Premium analytics unlocked
```

### Progress Visualization
```
Gallery Header:
├─ Total Emeralds: 127 (progress bar to 200)
├─ Catalog Created: 8 (next: unlock template pack)
├─ Sales This Month: $2.3M COP (goal: $3M)
└─ Ambassador Network: 5 (invite 5 more for bonus)
```

## 🔮 Future Journey Enhancements

### Phase 2: Advanced Flows
```
- AR Try-On: Upload → AR View → Share virtual try-on
- Voice Input: Upload → Dictate name → AI transcribes
- OCR Scanning: Upload certificate → Auto-fill details
- Batch Operations: Select multiple → Bulk edit → Save all
```

### Phase 3: Social Features
```
- Collections: Create → Share → Collaborate
- Comments: View emerald → Add note → Team sees
- Approvals: Upload → Request review → Manager approves
- Leaderboard: View rankings → Compare sales → Compete
```

## 📱 Mobile-Specific Considerations

### iOS Gestures
```
- Swipe right: Back navigation (system gesture)
- Swipe down: Dismiss modal (sheet gesture)
- Long press: Quick actions menu
- Pinch to zoom: Gallery images
- Pull to refresh: Update inventory
```

### Offline Support
```
Gallery: Cached images load instantly
Upload: Queue for sync when online
Inventory: Read-only access to cached data
Catalog: Generate from cached emeralds
More tools: Show "Offline" banner
```

### Notifications
```
- Upload complete: "Esmeralda saved successfully!"
- Sale recorded: "You sold 'Verde Sublime' for $450,000"
- Low stock: "Only 3 emeralds left in inventory"
- Ambassador message: "Carlos sent you a message"
```

---

**Journey Philosophy**: Minimal friction, maximum clarity
**Design Principle**: Every tap should feel purposeful
**Success Measure**: Users achieve goals effortlessly

*Last updated: 2025-12-01*
