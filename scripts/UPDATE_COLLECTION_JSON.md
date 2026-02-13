# Update Collection JSON in Google Drive

## 📍 Location
Google Drive: `collections/ceo-coomunity/collection.json`

## ✅ What Changed
Added two new fields to each product for static video support:
- `videoUrl`: Direct path to video file in deployment (e.g., `/images/901.mp4`)
- `posterUrl`: Direct path to poster image (e.g., `/images/901-poster.jpg`)

## 📝 Instructions

1. **Open Google Drive** and navigate to:
   ```
   collections/ceo-coomunity/collection.json
   ```

2. **Add the new fields** to each product object:
   ```json
   {
     "item": 901,
     "nombre": "Reino de Paz",
     "peso": 2.5,
     "precioCOP": 15000000,
     "precioInternacional": 4500,
     "talla": "Esmeralda",
     "videoUrl": "/images/901.mp4",        ← ADD THIS
     "posterUrl": "/images/901-poster.jpg", ← ADD THIS
     "mediaType": "video"
   }
   ```

3. **Repeat for all products** (901-907)

4. **Save the file** in Google Drive

## 📄 Template Reference
See `collection-json-template.json` in this folder for the complete structure.

## ⚠️ Important Notes
- Product names (nombre) are already correct - DO NOT change them
- Keep existing fields (item, peso, precioCOP, etc.)
- Only ADD the new videoUrl and posterUrl fields
- The mediaType field should remain "video"

## 🎯 Video File Paths
All videos are in `public/images/`:
- 901.mp4 → Reino de Paz
- 902.mp4 → Tierra Sagrada
- 903.mp4 → Eco de Luz
- 904.mp4 → Alma de la Montaña
- 905.mp4 → Canto del Río
- 906.mp4 → Corazón de la Mina
- 907.mp4 → Abrazo del Bosque

## 🧪 After Updating
1. Test locally: `npm run preview`
2. Visit: http://localhost:4173/c/ceo-tierra-madre
3. Verify videos load instantly without Drive API calls
4. Deploy: `git push` to main branch
