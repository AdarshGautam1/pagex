import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { supabaseAdmin } from '../src/lib/supabase';

dotenv.config();

const SEED_ASSETS_DIR = path.resolve(__dirname, '../seed-assets');
const COVERS_DIR = path.join(SEED_ASSETS_DIR, 'covers');
const PDFS_DIR = path.join(SEED_ASSETS_DIR, 'pdfs');

interface DemoBookSeed {
  title: string;
  author: string;
  categoryName: string;
  pageCount: number;
  description: string;
  coverFilename: string;
  pdfFilename: string;
}

const DEMO_BOOKS: DemoBookSeed[] = [
  {
    title: 'The Last Cartographer',
    author: 'Elena Voss',
    categoryName: 'Fiction',
    pageCount: 24,
    description:
      'A short story about the final mapmaker in a world that has been fully charted, who discovers one last unmapped territory — inside the human mind.',
    coverFilename: 'cartographer.jpg',
    pdfFilename: 'the-last-cartographer.pdf',
  },
  {
    title: 'Quantum Threads',
    author: 'Dr. Sanjay Mehta',
    categoryName: 'Science',
    pageCount: 18,
    description:
      'An accessible introduction to quantum entanglement, written for curious readers who want to understand the fabric of reality without a physics degree.',
    coverFilename: 'quantum-threads.jpg',
    pdfFilename: 'quantum-threads.pdf',
  },
  {
    title: 'Empires of Sand',
    author: 'Marcus Blackwell',
    categoryName: 'History',
    pageCount: 22,
    description:
      'A concise survey of three desert civilizations — Nabataean, Garamantian, and Aksumite — and the trade routes that connected them.',
    coverFilename: 'empires-of-sand.jpg',
    pdfFilename: 'empires-of-sand.pdf',
  },
  {
    title: 'Building Tomorrow',
    author: 'Ada Chen',
    categoryName: 'Technology',
    pageCount: 20,
    description:
      'A primer on sustainable software architecture, exploring how thoughtful engineering decisions today shape the digital infrastructure of the future.',
    coverFilename: 'building-tomorrow.jpg',
    pdfFilename: 'building-tomorrow.pdf',
  },
  {
    title: 'The Examined Life',
    author: 'Prof. Rhea Dalton',
    categoryName: 'Philosophy',
    pageCount: 16,
    description:
      'Five essential thought experiments — from Plato’s Cave to the Ship of Theseus — retold for modern readers with contemporary parallels.',
    coverFilename: 'examined-life.jpg',
    pdfFilename: 'the-examined-life.pdf',
  },
];

async function seed() {
  console.log('--- Starting PAGEX Demo Books Seeding ---');

  // 1. Fetch categories
  const { data: categories, error: catError } = await supabaseAdmin
    .from('categories')
    .select('id, name');

  if (catError || !categories || categories.length === 0) {
    console.error('Failed to load categories. Please ensure schema.sql has been run first.');
    process.exit(1);
  }

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.name.toLowerCase(), c.id);
  }

  for (const book of DEMO_BOOKS) {
    console.log(`\nProcessing: "${book.title}"...`);

    const coverLocalPath = path.join(COVERS_DIR, book.coverFilename);
    const pdfLocalPath = path.join(PDFS_DIR, book.pdfFilename);

    if (!fs.existsSync(coverLocalPath) || !fs.existsSync(pdfLocalPath)) {
      console.warn(`Files missing for ${book.title}. Skipping.`);
      continue;
    }

    const coverBuffer = fs.readFileSync(coverLocalPath);
    const pdfBuffer = fs.readFileSync(pdfLocalPath);

    const storageCoverPath = `covers/${book.coverFilename}`;
    const storagePdfPath = `books/${book.pdfFilename}`;

    // Upload cover to public 'covers' bucket
    console.log(`Uploading cover to covers/${storageCoverPath}...`);
    const { error: coverUploadError } = await supabaseAdmin.storage
      .from('covers')
      .upload(storageCoverPath, coverBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (coverUploadError) {
      console.warn(`Cover upload warning: ${coverUploadError.message}`);
    }

    // Upload PDF to private 'pdfs' bucket
    console.log(`Uploading PDF to pdfs/${storagePdfPath}...`);
    const { error: pdfUploadError } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(storagePdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (pdfUploadError) {
      console.warn(`PDF upload warning: ${pdfUploadError.message}`);
    }

    const categoryId = categoryMap.get(book.categoryName.toLowerCase()) || null;

    // Check if book already exists
    const { data: existingBook } = await supabaseAdmin
      .from('books')
      .select('id')
      .eq('title', book.title)
      .maybeSingle();

    if (existingBook) {
      console.log(`Book "${book.title}" already exists. Updating metadata...`);
      await supabaseAdmin
        .from('books')
        .update({
          author: book.author,
          category_id: categoryId,
          page_count: book.pageCount,
          description: book.description,
          cover_path: storageCoverPath,
          pdf_path: storagePdfPath,
          published: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBook.id);
    } else {
      console.log(`Creating book "${book.title}" in database...`);
      const { error: insertError } = await supabaseAdmin.from('books').insert({
        title: book.title,
        author: book.author,
        category_id: categoryId,
        page_count: book.pageCount,
        description: book.description,
        cover_path: storageCoverPath,
        pdf_path: storagePdfPath,
        published: true,
      });

      if (insertError) {
        console.error(`Error inserting book ${book.title}:`, insertError.message);
      } else {
        console.log(`Successfully seeded "${book.title}".`);
      }
    }
  }

  console.log('\n--- Seeding Completed Successfully! ---');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding encountered an error:', err);
  process.exit(1);
});
