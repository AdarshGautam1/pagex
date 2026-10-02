import dotenv from 'dotenv';
import { supabaseAdmin } from '../src/lib/supabase';

dotenv.config();

async function promoteUserToAdmin(email: string) {
  if (!email || !email.includes('@')) {
    console.error('Error: Please provide a valid user email address.');
    console.log('Usage: npx tsx scripts/promote-admin.ts user@example.com');
    process.exit(1);
  }

  console.log(`Searching for user with email: ${email}...`);

  // Find user in auth.users
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error('Failed to list auth users:', listError.message);
    process.exit(1);
  }

  const targetUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!targetUser) {
    console.error(`User with email "${email}" not found in Supabase Auth.`);
    process.exit(1);
  }

  console.log(`Found user: ${targetUser.id}. Promoting to admin role in profiles table...`);

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', targetUser.id)
    .select('*')
    .single();

  if (updateError || !profile) {
    console.error('Failed to update profile role:', updateError?.message);
    process.exit(1);
  }

  console.log('Successfully promoted user to admin:');
  console.log({
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    role: profile.role,
  });

  process.exit(0);
}

const targetEmail = process.argv[2];
promoteUserToAdmin(targetEmail).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
