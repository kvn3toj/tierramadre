# Image Upload Manual - Tierra Madre Studio

## Guide for Uploading Inventory Photos to Google Drive

This document explains how to upload emerald images to the Tierra Madre inventory system.

---

## 1. Prerequisites

### Required Access
- Google account with access to the shared Tierra Madre folder
- Images in JPG, PNG, or WebP format
- Product number (Item Number) for each emerald

### Google Drive Folder
Request access to the shared inventory folder:
```
📁 Tierra Madre - Image Inventory
```

---

## 2. File Naming Convention

### Recommended Format
```
product-{ITEM_NUMBER}-{DESCRIPTION}.jpg
```

### Examples
| File | Description |
|------|-------------|
| `product-101-front.jpg` | Front view of product 101 |
| `product-101-side.jpg` | Side view of product 101 |
| `product-102-macro.jpg` | Macro photo of product 102 |
| `product-103-lifestyle.jpg` | Lifestyle photo of product 103 |

### Recommended Suffixes
- `-front` - Main/front view
- `-side` - Side view
- `-macro` - Close-up/macro detail
- `-back` - Back view
- `-scale` - With size reference
- `-lifestyle` - In context/use
- `-certificate` - Certificate photo

---

## 3. Steps to Upload Images

### Step 1: Prepare Images

1. **Check quality** before uploading:
   - Minimum resolution: **1200 x 1200 pixels**
   - Ideal size: **100KB - 3MB**
   - Format: **JPG** (preferred) or PNG
   - Background: Clean, preferably white or neutral

2. **Rename files** following the convention:
   ```
   product-{NUMBER}-{description}.jpg
   ```

### Step 2: Access Google Drive

1. Go to [Google Drive](https://drive.google.com)
2. Navigate to the shared folder **"Tierra Madre - Inventory"**
3. Open the current month's subfolder (if exists)

### Step 3: Upload Files

**Option A: Drag and Drop**
1. Select files on your computer
2. Drag them directly to the Drive window

**Option B: Upload Button**
1. Click **"+ New"** (top left corner)
2. Select **"File upload"**
3. Choose files to upload

**Option C: From Mobile**
1. Open the Google Drive app
2. Tap the **"+"** button
3. Select **"Upload"**
4. Choose photos from gallery

### Step 4: Verify Upload

After uploading, verify that:
- [ ] Files appear in the correct folder
- [ ] Names follow the format `product-XXX-description.jpg`
- [ ] Images display correctly

---

## 4. Quality Specifications

### Minimum Requirements

| Aspect | Minimum | Ideal | Maximum |
|--------|---------|-------|---------|
| Width | 800px | 1200px+ | 4000px |
| Height | 800px | 1200px+ | 4000px |
| File size | 100KB | 500KB-2MB | 5MB |
| Format | JPG/PNG | JPG | WebP |

### Star Rating System

The system automatically rates each image:

| Stars | Rating | Meaning |
|-------|--------|---------|
| ⭐⭐⭐⭐⭐ | Excellent | Ready for professional catalog |
| ⭐⭐⭐⭐ | Very Good | Acceptable for general use |
| ⭐⭐⭐ | Good | Needs minor review |
| ⭐⭐ | Fair | Consider retaking |
| ⭐ | Poor | Do not use, retake photo |

### Evaluation Criteria

1. **Resolution (40 points)**
   - 1200px+: Excellent
   - 800-1199px: Good
   - 400-799px: Fair
   - <400px: Poor

2. **File Size (30 points)**
   - 100KB-3MB: Optimal
   - <100KB: Too small (low quality)
   - >5MB: Too large (needs optimization)

3. **Format (15 points)**
   - JPG/WebP: Optimal for web
   - PNG: Good (heavier)
   - Others: Convert

4. **Aspect Ratio (15 points)**
   - 1:1 (square): Ideal for catalogs
   - 4:3 or 3:4: Acceptable
   - Very elongated: Crop

---

## 5. Tips for Better Photos

### Lighting
- Use diffused natural light or softbox
- Avoid harsh shadows
- Maintain consistent exposure

### Composition
- Center the emerald in the frame
- Leave margin around it (10-15%)
- Neutral background (white, light gray, black)

### Focus
- Use tripod if possible
- Focus on the center of the stone
- Use aperture f/8-f/11 for sharpness

### Post-Processing
- Adjust white balance
- Don't over-saturate greens
- Keep natural appearance

---

## 6. System Synchronization

### Automatic Process

Once images are uploaded to Drive:

```
Google Drive → Cloudinary (CDN) → Tierra Madre App
     ↓              ↓                    ↓
  Backup       Optimization         Display
```

### Verify in the App

1. Open [Tierra Madre Studio](https://tierra-madre-studio.vercel.app)
2. Go to **Inventory** section
3. Search for the product by number
4. Verify that the image appears correctly

### Verification API

To verify a specific image's quality:
```
/api/verify-image?itemNumber={NUMBER}
```

Example:
```
https://tierra-madre-studio.vercel.app/api/verify-image?itemNumber=101
```

---

## 7. Troubleshooting

### Image doesn't appear in the app

1. Verify the name follows the correct format
2. Wait 5-10 minutes for synchronization
3. Clear browser cache
4. Contact administrator

### Quality shows as "Poor"

1. Verify resolution (minimum 800px)
2. Verify file size (minimum 100KB)
3. Retake the photo with better lighting
4. Use JPG format instead of compressed PNG

### Upload error

1. Verify internet connection
2. Verify you have folder permissions
3. Try with smaller files
4. Contact administrator

---

## 8. Storage Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TIERRA MADRE IMAGE SYSTEM                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   GOOGLE    │    │  CLOUDINARY │    │   GOOGLE    │     │
│  │    DRIVE    │───▶│    (CDN)    │◀───│   SHEETS    │     │
│  │             │    │             │    │             │     │
│  │  Originals  │    │  Optimized  │    │  Database   │     │
│  │   Backup    │    │  Delivery   │    │  Tracking   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                      │
│                   │  TIERRA MADRE   │                      │
│                   │      APP        │                      │
│                   │                 │                      │
│                   │  - Inventory    │                      │
│                   │  - Catalog      │                      │
│                   │  - Verification │                      │
│                   └─────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cloudinary Folder Structure

```
cloudinary/dyam6g2os/
└── tierramadre/
    ├── product-100/
    │   ├── image1.jpg
    │   └── image2.jpg
    ├── product-101/
    │   └── image1.jpg
    ├── product-102/
    │   ├── image1.jpg
    │   ├── image2.jpg
    │   └── image3.jpg
    └── inventory/
        └── general-assets/
```

---

## 9. Quick Reference Card

### File Naming
```
product-{ITEM}-{view}.jpg

Examples:
  product-101-front.jpg
  product-101-macro.jpg
  product-102-side.jpg
```

### Quality Checklist
```
☑ Resolution: 1200px minimum
☑ File size: 100KB - 3MB
☑ Format: JPG preferred
☑ Aspect ratio: Square (1:1) ideal
☑ Background: Clean/neutral
☑ Focus: Sharp on stone
☑ Lighting: Even, no harsh shadows
```

### Verification URL
```
https://tierra-madre-studio.vercel.app/api/verify-image?itemNumber=XXX
```

---

## 10. Contact & Support

For technical issues or access requests:
- **Email**: [support@tierramadre.com]
- **WhatsApp**: [+57 XXX XXX XXXX]

---

*Last updated: December 2025*
*Version: 1.0*
