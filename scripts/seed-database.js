const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with demo music...");

  const demoSongs = [
    {
      title: "Midnight Drift",
      artist: "Lumina",
      album: "Neon Odyssey",
      duration: 32,
      audioUrl: "/demo/midnight-drift.wav",
      coverUrl: "/demo/covers/cover-1.svg",
      isAuthorizedDownload: true,
      format: "wav",
      fileSize: 5644844,
    },
    {
      title: "Golden Hour Glow",
      artist: "Solstice",
      album: "Sunlight Reflections",
      duration: 28,
      audioUrl: "/demo/golden-hour-glow.wav",
      coverUrl: "/demo/covers/cover-2.svg",
      isAuthorizedDownload: true,
      format: "wav",
      fileSize: 4939244,
    },
    {
      title: "Echoes of Silence",
      artist: "Kaelen",
      album: "Dusk Diaries",
      duration: 30,
      audioUrl: "/demo/echoes-of-silence.wav",
      coverUrl: "/demo/covers/cover-3.svg",
      isAuthorizedDownload: true,
      format: "wav",
      fileSize: 5292044,
    },
    {
      title: "Quantum Horizons",
      artist: "Apex Echo",
      album: "Cybernetic Pulse",
      duration: 26,
      audioUrl: "/demo/quantum-horizons.wav",
      coverUrl: "/demo/covers/cover-4.svg",
      isAuthorizedDownload: true,
      format: "wav",
      fileSize: 4586444,
    },
    {
      title: "Velvet Horizons",
      artist: "Maya Chen",
      album: "Deep Sessions Vol. 1",
      duration: 34,
      audioUrl: "/demo/velvet-horizons.wav",
      coverUrl: "/demo/covers/cover-5.svg",
      isAuthorizedDownload: true,
      format: "wav",
      fileSize: 5997644,
    },
  ];

  const createdSongs = [];
  for (const songData of demoSongs) {
    const existing = await prisma.song.findFirst({
      where: { title: songData.title, artist: songData.artist },
    });

    if (!existing) {
      const song = await prisma.song.create({
        data: songData,
      });
      createdSongs.push(song);
      console.log(`Created song: ${song.title}`);
    } else {
      createdSongs.push(existing);
      console.log(`Song already exists: ${existing.title}`);
    }
  }

  // Set first song as favorite if not already favorited
  if (createdSongs.length > 0) {
    const favExists = await prisma.favorite.findUnique({
      where: { songId: createdSongs[0].id },
    });
    if (!favExists) {
      await prisma.favorite.create({
        data: { songId: createdSongs[0].id },
      });
      console.log(`Favorited: ${createdSongs[0].title}`);
    }
  }

  // Create demo playlist if not exists
  const playlistName = "Deep Focus & Beats";
  let playlist = await prisma.playlist.findFirst({
    where: { name: playlistName },
  });

  if (!playlist) {
    playlist = await prisma.playlist.create({
      data: {
        name: playlistName,
        description: "Curated ambient grooves and electronic pulses for flow state.",
        coverUrl: "/demo/covers/cover-1.svg",
      },
    });
    console.log(`Created playlist: ${playlist.name}`);

    // Add first 3 songs to playlist
    for (let i = 0; i < Math.min(3, createdSongs.length); i++) {
      await prisma.playlistSong.create({
        data: {
          playlistId: playlist.id,
          songId: createdSongs[i].id,
          order: i,
        },
      });
    }
    console.log(`Added songs to playlist "${playlist.name}"`);
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
