/**
 * Browser Console Script - Check Local Image Storage
 *
 * Copy and paste this into the browser console on tierra-madre.vercel.app
 * to see what images are stored locally.
 */

(function checkLocalImages() {
  console.log('🔍 Checking Local Image Storage...\n');

  // Check legacy media storage
  const legacyMedia = JSON.parse(localStorage.getItem('tierramadre-inventory-media') || '{}');
  const legacyKeys = Object.keys(legacyMedia);

  console.log('📦 Legacy Media Storage:');
  if (legacyKeys.length > 0) {
    console.log(`   Found ${legacyKeys.length} items:`);
    legacyKeys.forEach(key => {
      const item = legacyMedia[key];
      console.log(`   - Item #${key}: ${item.mediaType} → ${item.url?.substring(0, 60)}...`);
    });
  } else {
    console.log('   No legacy media found');
  }

  // Check gallery storage
  const galleries = JSON.parse(localStorage.getItem('tierramadre-inventory-gallery') || '{}');
  const galleryKeys = Object.keys(galleries);

  console.log('\n📸 Gallery Storage:');
  if (galleryKeys.length > 0) {
    console.log(`   Found ${galleryKeys.length} items with galleries:`);
    galleryKeys.forEach(key => {
      const gallery = galleries[key];
      console.log(`   - Item #${key}: ${gallery.length} image(s)`);
      gallery.forEach((img, i) => {
        console.log(`     ${i + 1}. ${img.type} → ${img.url?.substring(0, 60)}...`);
      });
    });
  } else {
    console.log('   No galleries found');
  }

  // Check Sheets cache
  const sheetsCache = JSON.parse(localStorage.getItem('tierramadre-inventory-sheets-cache') || 'null');

  console.log('\n📊 Google Sheets Cache:');
  if (sheetsCache && sheetsCache.data) {
    const withImages = sheetsCache.data.filter(i => i.imageUrl && i.imageUrl.trim());
    const withoutImages = sheetsCache.data.filter(i => !i.imageUrl || !i.imageUrl.trim());

    console.log(`   Total items: ${sheetsCache.data.length}`);
    console.log(`   With imageUrl: ${withImages.length}`);
    console.log(`   Without imageUrl: ${withoutImages.length}`);

    if (withImages.length > 0) {
      console.log('\n   Items WITH images:');
      withImages.forEach(i => {
        console.log(`   - #${i.item} ${i.nombre}: ${i.imageUrl?.substring(0, 60)}...`);
      });
    }

    if (withoutImages.length > 0) {
      console.log('\n   Items WITHOUT images (first 20):');
      withoutImages.slice(0, 20).forEach(i => {
        console.log(`   - #${i.item} ${i.nombre}`);
      });
    }
  } else {
    console.log('   No Sheets cache found');
  }

  console.log('\n✅ Done! Check the output above to see image status.');

  // Return summary
  return {
    legacyMedia: legacyKeys.length,
    galleries: galleryKeys.length,
    sheetsWithImages: sheetsCache?.data?.filter(i => i.imageUrl && i.imageUrl.trim()).length || 0,
    sheetsWithoutImages: sheetsCache?.data?.filter(i => !i.imageUrl || !i.imageUrl.trim()).length || 0,
  };
})();
