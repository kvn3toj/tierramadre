# 📐 Page Hierarchy & Content Structure

## 🏗️ Complete Information Architecture

```
Tierra Madre Studio
│
├─ 🏠 PRIMARY NAVIGATION (Tab Bar - Always Visible)
│  │
│  ├─ 📷 GALLERY (Home/Landing Page)
│  │  ├─ Hero Section
│  │  │  └─ Large Title: "Your Gallery"
│  │  │  └─ Subtitle: "Colombian Emeralds"
│  │  │  └─ Stats: Total emeralds, Total value
│  │  ├─ Quick Actions
│  │  │  └─ Search emeralds
│  │  │  └─ Filter by category
│  │  │  └─ Sort (recent, price, name)
│  │  ├─ Emerald Grid
│  │  │  └─ IOSCard for each emerald
│  │  │     ├─ Image/Video thumbnail
│  │  │     ├─ Name (AI-generated)
│  │  │     ├─ Weight (carats)
│  │  │     ├─ Price (COP)
│  │  │     ├─ Category badge (loose/ring/pendant/earrings)
│  │  │     └─ Status indicator (available/sold/reserved)
│  │  ├─ Empty State
│  │  │  └─ "No emeralds yet. Upload your first one!"
│  │  │  └─ CTA Button → Upload page
│  │  └─ Pagination/Infinite Scroll
│  │
│  ├─ ⬆️ UPLOAD (Creation Flow)
│  │  ├─ Header
│  │  │  └─ Title: "Upload Emeralds"
│  │  │  └─ Progress indicator (if multi-step)
│  │  ├─ File Upload Section
│  │  │  └─ IOSFilePicker
│  │  │     ├─ Camera button (mobile)
│  │  │     ├─ Browse files button
│  │  │     ├─ Drag & drop zone
│  │  │     └─ Preview grid (if batch mode)
│  │  ├─ AI Analysis Section
│  │  │  └─ Loading state (analyzing...)
│  │  │  └─ AI-Suggested Names (5 options)
│  │  │     ├─ Chip buttons for each name
│  │  │     └─ Refresh button (get new names)
│  │  │  └─ Custom name input
│  │  │  └─ AI Description (read-only, italic)
│  │  ├─ Details Form
│  │  │  └─ Category selector (4 buttons)
│  │  │     ├─ Suelta (Loose)
│  │  │     ├─ Anillo (Ring)
│  │  │     ├─ Dije (Pendant)
│  │  │     └─ Aretes (Earrings)
│  │  │  └─ Weight (quilates) - number input
│  │  │  └─ Price (COP) - formatted currency input
│  │  │  └─ Lot Code (optional) - text input
│  │  ├─ Error/Success Alerts
│  │  │  └─ IOSCard with error/success styling
│  │  └─ Actions
│  │     ├─ Cancel button (plain)
│  │     └─ Save button (filled, emerald green)
│  │        └─ Auto-navigate to Gallery on success
│  │
│  ├─ 📦 INVENTORY (Management Hub)
│  │  ├─ Header
│  │  │  └─ Large Title: "Inventory"
│  │  │  └─ Subtitle: "X emeralds • $XXX,XXX COP total"
│  │  │  └─ Actions:
│  │  │     ├─ Add button → Upload page
│  │  │     └─ Filter button → Filter sheet
│  │  ├─ Filter Chips (Active Filters)
│  │  │  └─ Status: Available/Sold/Reserved
│  │  │  └─ Category: Loose/Ring/Pendant/Earrings
│  │  │  └─ Price Range
│  │  │  └─ Weight Range
│  │  │  └─ Clear All button
│  │  ├─ Inventory Table/List
│  │  │  └─ IOSCard for each item
│  │  │     ├─ Thumbnail
│  │  │     ├─ Name
│  │  │     ├─ SKU/Lot Code
│  │  │     ├─ Weight
│  │  │     ├─ Price
│  │  │     ├─ Status badge
│  │  │     ├─ Quick actions (Edit/Delete/Sell)
│  │  │     └─ Tap → Detail modal
│  │  ├─ Bulk Actions (Multi-select mode)
│  │  │  └─ Select All checkbox
│  │  │  └─ Bulk Edit
│  │  │  └─ Bulk Export
│  │  │  └─ Bulk Delete
│  │  ├─ Analytics Summary Cards
│  │  │  └─ Total Inventory Value
│  │  │  └─ Available Count
│  │  │  └─ Sold This Month
│  │  │  └─ Average Price per Carat
│  │  └─ Export Options
│  │     ├─ Export to Excel
│  │     ├─ Generate Catalog PDF
│  │     └─ Share via WhatsApp
│  │
│  ├─ 👥 AMBASSADORS (Community)
│  │  ├─ Header
│  │  │  └─ Large Title: "Ambassadors"
│  │  │  └─ Subtitle: "Community leaders"
│  │  │  └─ Action: Add Ambassador button
│  │  ├─ Ambassador Cards Grid
│  │  │  └─ IOSCard for each ambassador
│  │  │     ├─ Profile photo
│  │  │     ├─ Display name
│  │  │     ├─ Bio (truncated)
│  │  │     ├─ Location
│  │  │     ├─ Stats (emeralds sold, rating)
│  │  │     ├─ Contact buttons
│  │  │     │  ├─ WhatsApp
│  │  │     │  ├─ Email
│  │  │     │  └─ Instagram
│  │  │     └─ Tap → Full profile modal
│  │  ├─ Ambassador Profile Modal
│  │  │  └─ Full-screen modal with close button
│  │  │     ├─ Hero section (photo + name)
│  │  │     ├─ Complete bio
│  │  │     ├─ Emerald collection (if shared)
│  │  │     ├─ Reviews/Testimonials
│  │  │     ├─ Contact methods
│  │  │     └─ Call-to-action (Contact Now)
│  │  └─ Empty State
│  │     └─ "No ambassadors yet. Add your first!"
│  │     └─ Add Ambassador CTA
│  │
│  └─ ••• MORE (Secondary Tools)
│     └─ Opens IOSMoreSheet modal
│
└─ 🔧 SECONDARY NAVIGATION (More Sheet - On Demand)
   │
   ├─ 📚 CATALOG (PDF Creation)
   │  ├─ Header
   │  │  └─ Title: "Catalog"
   │  │  └─ Subtitle: "Create professional PDFs"
   │  ├─ Catalog Builder
   │  │  └─ Select Emeralds (multi-select from inventory)
   │  │  └─ Catalog Settings
   │  │     ├─ Title/Cover
   │  │     ├─ Layout (grid/list)
   │  │     ├─ Columns (2/3/4)
   │  │     ├─ Include prices (toggle)
   │  │     ├─ Include descriptions (toggle)
   │  │     └─ Logo position
   │  ├─ Preview Section
   │  │  └─ Live preview of PDF
   │  │  └─ Page navigation (if multi-page)
   │  └─ Export Actions
   │     ├─ Generate PDF button
   │     ├─ Download PDF
   │     └─ Share via WhatsApp/Email
   │
   ├─ 📅 CALENDAR (Instagram Planning)
   │  ├─ Header
   │  │  └─ Title: "Instagram Calendar"
   │  │  └─ Month selector
   │  ├─ Calendar Grid (3x3 or custom)
   │  │  └─ Draggable emerald thumbnails
   │  │  └─ Visual preview of grid layout
   │  │  └─ Empty slots (add content)
   │  ├─ Content Library
   │  │  └─ All emerald images
   │  │  └─ Filter by category
   │  │  └─ Drag to calendar
   │  ├─ Post Details
   │  │  └─ Caption generator (AI-powered)
   │  │  └─ Hashtags
   │  │  └─ Scheduled date/time
   │  └─ Export
   │     ├─ Export grid as image
   │     └─ Export individual posts
   │
   ├─ 🎨 SLIDES (AI Presentations)
   │  ├─ Header
   │  │  └─ Title: "Slides Generator"
   │  ├─ Slide Configuration
   │  │  └─ Topic input
   │  │  └─ Number of slides
   │  │  └─ Style (professional/creative)
   │  ├─ AI Generation
   │  │  └─ Generate button
   │  │  └─ Loading state with progress
   │  │  └─ AI-generated slides
   │  ├─ Slide Preview
   │  │  └─ Slide navigation (prev/next)
   │  │  └─ Edit slide content
   │  │  └─ Add/Remove slides
   │  └─ Export
   │     ├─ Download PowerPoint
   │     ├─ Download PDF
   │     └─ Share link
   │
   ├─ ✨ NORMALIZER (Name Cleaning)
   │  ├─ Header
   │  │  └─ Title: "Name Normalizer"
   │  ├─ Input Section
   │  │  └─ Paste raw names (bulk text area)
   │  │  └─ OR upload Excel file
   │  ├─ Normalization Rules
   │  │  └─ Remove duplicates (toggle)
   │  │  └─ Fix capitalization (toggle)
   │  │  └─ Remove special characters (toggle)
   │  │  └─ Custom rules (regex)
   │  ├─ Preview Section
   │  │  └─ Before/After comparison
   │  │  └─ Highlight changes
   │  └─ Export
   │     ├─ Copy to clipboard
   │     ├─ Download CSV
   │     └─ Apply to inventory (update names)
   │
   ├─ 🧾 RECEIPTS (Invoice Generation)
   │  ├─ Header
   │  │  └─ Title: "Receipts"
   │  ├─ Receipt Form
   │  │  └─ Customer info
   │  │     ├─ Name
   │  │     ├─ Email
   │  │     ├─ Phone
   │  │     └─ Address
   │  │  └─ Receipt items
   │  │     ├─ Select from inventory
   │  │     ├─ Quantity
   │  │     ├─ Price (editable)
   │  │     └─ Add/Remove items
   │  │  └─ Receipt details
   │  │     ├─ Receipt number (auto-generated)
   │  │     ├─ Date
   │  │     ├─ Payment method
   │  │     ├─ Notes
   │  │     └─ Tax/Discount
   │  ├─ Receipt Preview
   │  │  └─ Live preview of formatted receipt
   │  │  └─ Logo + branding
   │  └─ Actions
   │     ├─ Generate PDF
   │     ├─ Send via email
   │     ├─ Send via WhatsApp
   │     └─ Print
   │
   ├─ 📖 BIBLIOTECA (Knowledge Base)
   │  ├─ Header
   │  │  └─ Title: "Biblioteca"
   │  │  └─ Subtitle: "Emerald knowledge"
   │  │  └─ Search bar
   │  ├─ Categories
   │  │  └─ IOSCard for each category
   │  │     ├─ Emerald Types
   │  │     ├─ Quality Grading
   │  │     ├─ Pricing Guide
   │  │     ├─ Care & Maintenance
   │  │     ├─ Certification
   │  │     └─ History & Culture
   │  ├─ Article List (per category)
   │  │  └─ Article cards
   │  │     ├─ Title
   │  │     ├─ Excerpt
   │  │     ├─ Read time
   │  │     └─ Tap → Full article
   │  └─ Article View
   │     ├─ Hero image
   │     ├─ Title
   │     ├─ Full content (markdown)
   │     ├─ Related articles
   │     └─ Share button
   │
   └─ 🧮 SIMULATOR (Price Calculator)
      ├─ Header
      │  └─ Title: "Price Simulator"
      ├─ Calculator Form
      │  └─ Input fields
      │     ├─ Weight (carats)
      │     ├─ Quality grade
      │     ├─ Color intensity
      │     ├─ Clarity
      │     ├─ Cut quality
      │     └─ Origin (Colombian/Other)
      │  └─ Advanced options
      │     ├─ Market conditions
      │     ├─ Demand multiplier
      │     └─ Seller type
      ├─ Results Section
      │  └─ Estimated Price Range
      │     ├─ Low estimate
      │     ├─ Average estimate
      │     ├─ High estimate
      │     └─ Confidence level
      │  └─ Price Breakdown
      │     ├─ Base price per carat
      │     ├─ Quality adjustments
      │     ├─ Market adjustments
      │     └─ Final calculation
      ├─ Comparison Chart
      │  └─ Graph: Price vs. Similar Emeralds
      │  └─ Market trends
      └─ Actions
         ├─ Save estimate to emerald
         ├─ Compare with inventory
         └─ Export report
```

## 📊 Content Priority Matrix

### High Priority (Primary Navigation)
| Page | Primary Purpose | Key Content | User Frequency |
|------|-----------------|-------------|----------------|
| **Gallery** | View collection | Emerald grid, search, filter | Daily |
| **Upload** | Add new emeralds | File picker, AI naming, form | Several times/week |
| **Inventory** | Manage stock | Table view, filters, analytics | Daily |
| **Ambassadors** | Community management | Ambassador cards, profiles | Weekly |

### Medium Priority (More Sheet - Top)
| Page | Primary Purpose | Key Content | User Frequency |
|------|-----------------|-------------|----------------|
| **Catalog** | Create marketing | PDF builder, preview, export | Weekly |
| **Calendar** | Social media planning | Grid layout, drag-drop | Weekly |
| **Receipts** | Generate invoices | Form, preview, send | Several times/week |

### Lower Priority (More Sheet - Bottom)
| Page | Primary Purpose | Key Content | User Frequency |
|------|-----------------|-------------|----------------|
| **Slides** | AI presentations | Generator, editor, export | Monthly |
| **Normalizer** | Clean data | Bulk editor, rules, apply | Monthly |
| **Biblioteca** | Learn about emeralds | Articles, search, categories | Monthly |
| **Simulator** | Price estimation | Calculator, results, save | Weekly |

## 🎯 Page Relationships

### Navigation Flows
```
Gallery → Upload → Gallery (success)
Gallery → Inventory → Edit → Gallery
Gallery → Catalog → Select items → Generate → Share
Inventory → Receipts → Select items → Generate → Send
Upload → Inventory (view new item)
Ambassadors → WhatsApp (external)
Calendar → Upload (get more content)
```

### Data Sharing
```
Gallery ←→ Inventory (same emerald data)
Upload → Gallery (creates new emerald)
Upload → Inventory (adds to stock)
Catalog ← Inventory (sources emeralds)
Receipts ← Inventory (sources products)
Simulator → Inventory (saves estimates)
Calendar ← Gallery (sources images)
```

## 🎨 Content Patterns

### Standard Page Structure
```tsx
<IOSLayout>
  <IOSNavigationBar
    title="Page Title"
    subtitle="Description"
    large={isPrimaryPage}
    trailingActions={[/* context actions */]}
  />

  <PageContent>
    {/* Hero/Header Section */}
    <Box sx={{ padding: iosSpacing.lg }}>
      <Typography variant="largeTitle">Welcome</Typography>
      <Typography variant="body">Description</Typography>
    </Box>

    {/* Main Content Cards */}
    <IOSCard title="Section">
      {/* Section content */}
    </IOSCard>

    {/* Actions/CTAs */}
    <Box sx={{ display: 'flex', gap: iosSpacing.sm }}>
      <IOSButton variant="filled">Primary Action</IOSButton>
      <IOSButton variant="tinted">Secondary</IOSButton>
    </Box>
  </PageContent>
</IOSLayout>
```

### Empty States
Every page should have an empty state:
```tsx
{items.length === 0 && (
  <IOSCard variant="glass" style={{ textAlign: 'center', padding: '48px' }}>
    <Typography variant="title1">No items yet</Typography>
    <Typography variant="body" color="secondary">
      Get started by adding your first item
    </Typography>
    <IOSButton variant="filled" icon={<Add />} onClick={navigateToCreate}>
      Add Item
    </IOSButton>
  </IOSCard>
)}
```

### Loading States
```tsx
{loading && (
  <Box sx={{ textAlign: 'center', padding: iosSpacing.xl }}>
    <IOSProgress variant="circular" size="large" />
    <Typography variant="body" color="secondary" sx={{ mt: 2 }}>
      Loading...
    </Typography>
  </Box>
)}
```

### Error States
```tsx
{error && (
  <IOSCard variant="flat" style={{
    backgroundColor: 'var(--status-error)20',
    borderColor: 'var(--status-error)'
  }}>
    <Typography color="error">{error}</Typography>
    <IOSButton variant="plain" onClick={retry}>
      Try Again
    </IOSButton>
  </IOSCard>
)}
```

## 📱 Mobile-First Content

### Gallery (Mobile)
- **Hero**: Stats in single row (compact)
- **Grid**: 2 columns (easier thumb reach)
- **Cards**: Larger touch targets (56px min height)
- **Search**: Sticky on scroll

### Upload (Mobile)
- **Camera**: Primary CTA (most common on mobile)
- **Form**: Single column, large inputs
- **AI Names**: Vertical stack (easier selection)
- **Keyboard**: Auto-scroll to focused input

### Inventory (Mobile)
- **View**: Switch to list (not table)
- **Filters**: Bottom sheet (not sidebar)
- **Actions**: Swipe gestures (iOS native)
- **Bulk**: Checkbox mode toggle

## 🔮 Future Enhancements

### Phase 2: Advanced Features
```
Gallery:
  - AR View (see emeralds in 3D)
  - Comparison mode (side-by-side)
  - Favorites/Collections

Upload:
  - Batch mode (multiple files)
  - OCR for certificates
  - Video analysis

Inventory:
  - QR code scanning
  - Barcode integration
  - Stock alerts

Ambassadors:
  - Direct messaging
  - Commission tracking
  - Performance analytics
```

### Phase 3: Integrations
```
- WhatsApp Business API
- Instagram Direct Publishing
- Shopify integration
- Accounting software sync
```

---

**Content Philosophy**: Progressive disclosure with clear hierarchy
**Primary Focus**: Gallery, Upload, Inventory (80% of usage)
**Secondary Tools**: Available on-demand via More sheet

*Last updated: 2025-12-01*
