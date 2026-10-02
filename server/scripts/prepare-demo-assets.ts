import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const ARTIFACT_DIR = 'C:\\Users\\DESKTOP-ADARSH\\.gemini\\antigravity-ide\\brain\\081a2e63-e424-46ef-af28-1588e1ddf5a9';
const ASSETS_DIR = path.resolve(__dirname, '../seed-assets');
const COVERS_DIR = path.join(ASSETS_DIR, 'covers');
const PDFS_DIR = path.join(ASSETS_DIR, 'pdfs');

// Ensure output directories exist
fs.mkdirSync(COVERS_DIR, { recursive: true });
fs.mkdirSync(PDFS_DIR, { recursive: true });

// 1. Copy generated covers
const coverMap = [
  { src: 'cartographer_cover_1790881125772.jpg', dest: 'cartographer.jpg' },
  { src: 'quantum_threads_cover_1790881141678.jpg', dest: 'quantum-threads.jpg' },
  { src: 'empires_of_sand_cover_1790881349626.jpg', dest: 'empires-of-sand.jpg' },
  { src: 'building_tomorrow_cover_1790881369072.jpg', dest: 'building-tomorrow.jpg' },
  { src: 'examined_life_cover_1790881387691.jpg', dest: 'examined-life.jpg' },
];

console.log('Copying generated covers...');
for (const item of coverMap) {
  const srcPath = path.join(ARTIFACT_DIR, item.src);
  const destPath = path.join(COVERS_DIR, item.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${item.src} -> ${item.dest}`);
  } else {
    console.warn(`Cover source not found: ${srcPath}`);
  }
}

// 2. Generate multi-page sample PDFs
interface BookData {
  filename: string;
  title: string;
  author: string;
  category: string;
  pages: { heading: string; paragraphs: string[] }[];
}

const booksData: BookData[] = [
  {
    filename: 'the-last-cartographer.pdf',
    title: 'The Last Cartographer',
    author: 'Elena Voss',
    category: 'Fiction',
    pages: [
      {
        heading: 'Prologue: The Edge of the Grid',
        paragraphs: [
          'In the year when the final satellite confirmed what every sailor had feared, the Guild of Cartographers closed its iron gates for the last time. Every inlet had been sounded, every mountain peak triangulated to within three decimal inches. The earth was complete, finished, encased in coordinate lines like an insect preserved in amber.',
          'Valen remained at his draughting table long after the ink had dried on the Guild’s final decree. He held in his palm an ivory ruler, yellowed with forty years of thumb-grease, and peered through the high arched window toward the harbor.',
          'There were no monsters left at the edges of the sea. No terra incognita where dragons coiled. Yet as he touched his temple, feeling the rhythmic pulse against bone, he knew that the most treacherous topography remained untouched by any lens.',
        ],
      },
      {
        heading: 'Chapter I: The Parchment of Silences',
        paragraphs: [
          'The traveler arrived on an afternoon when the sea tasted of salt and burning cedar. She carried no luggage save a brass cylinder wrapped in oilcloth.',
          '"They say you were the one who mapped the Straits of Oakhaven," she spoke without ceremony, brushing sea-spray from her collar. "The currents that no tide-table predicted."',
          'Valen did not look up from his scraper. "That was thirty years ago, when men still believed currents had wills. Now they have algorithms. If you came for a nautical chart, the Admiralty sells them for two pence at the quay."',
          '"I do not need a chart of the water," she replied. She set the cylinder upon the oak table, and the sound echoed like a bell in the vast, empty room. "I need you to chart what lies between two memories."',
        ],
      },
      {
        heading: 'Chapter II: The Interior Meridian',
        paragraphs: [
          'Memory, Valen discovered over the candlelit weeks that followed, resists projection. It possesses neither latitude nor longitude, only depth and gravity.',
          'When he pressed the needle into the vellum, the line did not follow the coastline of physical islands, but the contours of grief and sudden joy. A coastline that shifted whenever the wind changed.',
          'By dawn, the parchment was covered in faint, labyrinthine tracings. He had charted an ocean where no vessel had ever sailed, yet every wave was familiar.',
          'He blew gently across the wet sepia, smiled into the twilight of his study, and realized that his true apprenticeship was only just beginning.',
        ],
      },
    ],
  },
  {
    filename: 'quantum-threads.pdf',
    title: 'Quantum Threads',
    author: 'Dr. Sanjay Mehta',
    category: 'Science',
    pages: [
      {
        heading: 'Introduction: The Unbroken Web',
        paragraphs: [
          'Imagine two coins tossed into the air on opposite sides of the visible universe. If the world obeyed our classical intuitions, each coin would tumble, spin, and settle according to its own localized wind currents and air resistance.',
          'Quantum entanglement shatters this comforting isolation. When two quantum particles share an entangled state, their outcomes are bound in a cosmic duet. Measure particle A to be spinning clockwise, and particle B instantaneously aligns counter-clockwise—not after a signal travels between them, but without any delay whatsoever.',
          'Einstein famously termed this "spooky action at a distance." Today, we recognize it not as a paradox, but as the foundational architecture of physical reality.',
        ],
      },
      {
        heading: 'Chapter I: Beyond the Classical Boundary',
        paragraphs: [
          'In 1964, John Stewart Bell published a paper that would change physics forever. Through an deceptively simple mathematical inequality, Bell demonstrated that either nature is non-local, or reality does not exist independently of observation.',
          'Subsequent laboratory experiments, notably those by Alain Aspect in Paris and Anton Zeilinger in Vienna, proved Bell’s theorem experimentally. The classical world is an illusion born of macroscopic averaging.',
          'At the subatomic scale, matter is not composed of discrete billiard balls bouncing in void; it is woven of probabilities, relations, and non-local correlations.',
        ],
      },
      {
        heading: 'Chapter II: The Quantum Information Era',
        paragraphs: [
          'What began as a philosophical inquiry into the nature of reality is now the bedrock of the 21st-century technological revolution: quantum computing, quantum cryptography, and teleportation protocols.',
          'A classical bit is constrained to be either 0 or 1. A quantum bit, or qubit, can exist in a superposition of both simultaneously. Through entanglement, quantum processors can evaluate vast mathematical landscapes in a single computational heartbeat.',
          'We stand on the threshold of an era where computation mirrors the mysterious, interconnected geometry of the cosmos itself.',
        ],
      },
    ],
  },
  {
    filename: 'empires-of-sand.pdf',
    title: 'Empires of Sand',
    author: 'Marcus Blackwell',
    category: 'History',
    pages: [
      {
        heading: 'Prologue: The Forgotten Crossroads',
        paragraphs: [
          'The desert is not an absence of life, but a crucible of human ingenuity. For centuries, modern historians treated the Sahara and the Arabian sands as impassable barriers, void spaces on the map separating the great centers of antiquity.',
          'Archaeological excavations of the past two decades have dismantled this Eurocentric illusion. Far from being empty wastelands, these arid expanses fostered some of the most sophisticated, resilient civilizations the ancient world ever knew.',
          'This book chronicles three kingdoms that mastered the trade winds of the desert: the Nabataeans of Petra, the Garamantes of the Fezzan, and the Aksumite Empire of the Horn of Africa.',
        ],
      },
      {
        heading: 'Chapter I: The Water Engineers of Petra',
        paragraphs: [
          'To gaze upon the rose-red facades carved into the sheer sandstone cliffs of Petra is to marvel at monumental architecture. Yet the true genius of the Nabataeans lay not in what they carved above ground, but what they channeled below.',
          'In a region receiving less than six inches of rainfall annually, Nabataean engineers constructed an intricate network of terracotta pipes, subterranean cisterns, and flood-control dams that sustained a city of thirty thousand inhabitants and tens of thousands of passing merchant caravans.',
          'They transformed thirst into monopoly, charging tariffs on frankincense, myrrh, and silk that enriched their capital beyond the dreams of Rome.',
        ],
      },
      {
        heading: 'Chapter II: The Silent Caravans',
        paragraphs: [
          'Across the Sahara, the Garamantes tapped into subterranean fossil aquifers through thousands of miles of hand-dug qanats, turning the Libyan desert into a fertile basin of wheat, dates, and olive groves.',
          'Their trade caravans linked sub-Saharan gold and ivory with the Mediterranean ports of Carthage and Leptis Magna. When Roman legions marched into the interior, they did not conquer a barbarian wilderness; they encountered a fortified civilization that commanded the trade arteries of an entire continent.',
        ],
      },
    ],
  },
  {
    filename: 'building-tomorrow.pdf',
    title: 'Building Tomorrow',
    author: 'Ada Chen',
    category: 'Technology',
    pages: [
      {
        heading: 'Introduction: The Weight of Software',
        paragraphs: [
          'There is a persistent myth that the digital realm is weightless. We speak of "the cloud," of "virtual machines," of data that floats frictionless through fiber-optic cables.',
          'Yet every line of code executed across the planet consumes electrons, heats silicon, and demands cooling water in hyperscale data centers. By 2030, global computational infrastructure is projected to consume more electricity than entire industrialized nations.',
          'Software architecture is no longer merely an exercise in logic and performance; it is an ecological discipline. Sustainable engineering begins with intentionality.',
        ],
      },
      {
        heading: 'Chapter I: Principles of Resilient Systems',
        paragraphs: [
          'The first principle of durable software is simplicity. Complexity is the silent killer of systems: it invites vulnerabilities, obfuscates state transitions, and creates cascading failure modes that defy intuition.',
          'Designing for longevity means choosing boring, battle-tested technologies over transient hype cycles. It means treating every network boundary as untrusted, every external dependency as a liability, and every user interaction as a promise of integrity.',
          'A system that survives ten years is not one that was built to do everything; it is one built to do one thing with absolute correctness.',
        ],
      },
      {
        heading: 'Chapter II: Zero-Trust by Architecture',
        paragraphs: [
          'Modern application security cannot rely on perimeter defenses or firewalls. In an era of pervasive mobility and distributed cloud services, the network itself is hostile.',
          'True architectural security is zero-trust: authenticating every transaction at the lowest level, enforcing least-privilege database row access, encrypting storage at rest and in transit, and auditing every access token without compromise.',
          'When we build systems with verified boundaries, we protect not just data, but human dignity in the digital commons.',
        ],
      },
    ],
  },
  {
    filename: 'the-examined-life.pdf',
    title: 'The Examined Life',
    author: 'Prof. Rhea Dalton',
    category: 'Philosophy',
    pages: [
      {
        heading: 'Introduction: The Unexamined Question',
        paragraphs: [
          '"An unexamined life," Socrates declared before the Athenian court in 399 BCE, "is not worth living for a human being." These words were not an academic aphorism, but a moral manifesto that cost him his breath.',
          'Philosophy in the modern world is often mischaracterized as abstract puzzle-solving, detached from the urgent pressures of daily life. In truth, philosophy is the most practical craft imaginable: the systematic interrogation of what is good, what is true, and how we ought to live together.',
          'This monograph examines five timeless thought experiments that strip away our cognitive complacency and reveal the foundations of our moral intuitions.',
        ],
      },
      {
        heading: 'Chapter I: The Shadows of the Cave',
        paragraphs: [
          'Plato’s Allegory of the Cave remains the definitive metaphor for human epistemology. Prisoners chained in darkness perceive only shadows cast on a limestone wall by figures moving before a fire behind them. To the prisoner, the shadow is the horse; the shadow is the storm.',
          'When one prisoner is liberated and dragged upward into the sunlight, the transition is agonizing. The light burns eyes accustomed to gloom. Yet once adjusted, he cannot return to the shadows and take their games seriously.',
          'In our contemporary media landscape of infinite algorithmic feeds and curated illusions, Plato’s cave is not an ancient curiosity—it is the room you are sitting in right now.',
        ],
      },
      {
        heading: 'Chapter II: The Ship of Identity',
        paragraphs: [
          'Consider the Ship of Theseus: over years of sea voyages, every timber, nail, and sail is replaced one by one until not a single atom of the original vessel remains. Is it still the same ship?',
          'If we gather all the discarded rotten planks and rebuild them into a second vessel, which one is the true ship of Theseus? The continuous process, or the original material?',
          'This ancient riddle strikes at the very heart of human identity. Every seven years, nearly every cell in our bodies is replaced. Our beliefs mutate, our memories fade. What, then, constitutes the "I" that reads these words?',
        ],
      },
    ],
  },
];

async function generatePdf(book: BookData): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const warmPaper = rgb(0.95, 0.93, 0.90); // #F2EEE6
  const charcoal = rgb(0.1, 0.1, 0.1);
  const oxblood = rgb(0.48, 0.19, 0.19); // #7A3030
  const muted = rgb(0.47, 0.44, 0.41);

  // 1. Title Page
  const titlePage = pdfDoc.addPage([400, 600]);
  titlePage.drawRectangle({
    x: 0,
    y: 0,
    width: 400,
    height: 600,
    color: warmPaper,
  });

  titlePage.drawText(book.category.toUpperCase(), {
    x: 50,
    y: 480,
    size: 10,
    font: timesRomanBold,
    color: oxblood,
  });

  titlePage.drawText(book.title, {
    x: 50,
    y: 430,
    size: 26,
    font: timesRomanBold,
    color: charcoal,
  });

  titlePage.drawText(`by ${book.author}`, {
    x: 50,
    y: 395,
    size: 14,
    font: timesRomanItalic,
    color: muted,
  });

  titlePage.drawLine({
    start: { x: 50, y: 370 },
    end: { x: 350, y: 370 },
    thickness: 1,
    color: rgb(0.83, 0.81, 0.77),
  });

  titlePage.drawText('PAGEX SECURE E-LIBRARY DEMO EDITION', {
    x: 50,
    y: 80,
    size: 8,
    font: timesRoman,
    color: muted,
  });

  // 2. Content Pages
  let pageNum = 1;
  for (const pageData of book.pages) {
    const page = pdfDoc.addPage([400, 600]);
    pageNum++;

    page.drawRectangle({
      x: 0,
      y: 0,
      width: 400,
      height: 600,
      color: warmPaper,
    });

    // Running header
    page.drawText(book.title.toUpperCase(), {
      x: 50,
      y: 560,
      size: 8,
      font: timesRoman,
      color: muted,
    });

    page.drawLine({
      start: { x: 50, y: 550 },
      end: { x: 350, y: 550 },
      thickness: 0.5,
      color: rgb(0.83, 0.81, 0.77),
    });

    // Section heading
    page.drawText(pageData.heading, {
      x: 50,
      y: 520,
      size: 14,
      font: timesRomanBold,
      color: oxblood,
    });

    // Paragraphs
    let currentY = 490;
    for (const para of pageData.paragraphs) {
      // Simple word wrapping
      const words = para.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const textWidth = timesRoman.widthOfTextAtSize(testLine, 10.5);
        if (textWidth > 300) {
          page.drawText(line, {
            x: 50,
            y: currentY,
            size: 10.5,
            font: timesRoman,
            color: charcoal,
          });
          currentY -= 16;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, {
          x: 50,
          y: currentY,
          size: 10.5,
          font: timesRoman,
          color: charcoal,
        });
        currentY -= 26; // paragraph spacing
      }
    }

    // Page number
    page.drawText(String(pageNum), {
      x: 195,
      y: 35,
      size: 9,
      font: timesRoman,
      color: muted,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(PDFS_DIR, book.filename);
  fs.writeFileSync(filePath, pdfBytes);
  console.log(`Generated ${book.filename} (${pageNum} pages)`);
}

async function run() {
  console.log('Generating demo PDF books...');
  for (const book of booksData) {
    await generatePdf(book);
  }
  console.log('All demo covers and PDFs prepared successfully in seed-assets/');
}

run().catch((err) => {
  console.error('Failed to prepare demo assets:', err);
  process.exit(1);
});
