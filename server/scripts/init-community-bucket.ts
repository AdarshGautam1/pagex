import { supabaseAdmin } from '../src/lib/supabase';

async function main() {
  console.log('[Storage] Checking and initializing "community-notes" bucket...');

  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    console.error('Failed to list storage buckets:', listError.message);
    process.exit(1);
  }

  const bucketExists = buckets?.some((b) => b.id === 'community-notes');

  if (bucketExists) {
    console.log('✓ Bucket "community-notes" already exists.');
  } else {
    const { data, error } = await supabaseAdmin.storage.createBucket('community-notes', {
      public: false, // Must remain private — access via signed URLs only
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['application/pdf'],
    });

    if (error) {
      console.error('Failed to create "community-notes" bucket:', error.message);
      process.exit(1);
    }
    console.log('✓ Successfully created private bucket "community-notes" in Supabase Storage!');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
