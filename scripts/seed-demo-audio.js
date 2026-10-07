// Script to generate high quality demo WAV audio files for Soundify
const fs = require("fs");
const path = require("path");

const publicDemoDir = path.join(__dirname, "..", "public", "demo");
if (!fs.existsSync(publicDemoDir)) {
  fs.mkdirSync(publicDemoDir, { recursive: true });
}

function writeWavFile(filePath, durationSec, noteGenerator) {
  const sampleRate = 44100;
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const totalSamples = Math.floor(sampleRate * durationSec);
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Generate left and right channels
    const [leftVal, rightVal] = noteGenerator(t, durationSec);

    // Apply soft fade in & fade out
    let envelope = 1;
    if (t < 0.5) envelope = t / 0.5;
    else if (t > durationSec - 1.5) envelope = (durationSec - t) / 1.5;

    const clamp = (val) => Math.max(-1, Math.min(1, val * envelope));
    const sampleL = Math.floor(clamp(leftVal) * 32767);
    const sampleR = Math.floor(clamp(rightVal) * 32767);

    buffer.writeInt16LE(sampleL, offset);
    offset += 2;
    buffer.writeInt16LE(sampleR, offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: ${filePath} (${durationSec}s, ${(dataSize / 1024 / 1024).toFixed(2)} MB)`);
}

// 1. Midnight Drift (Chill Synthwave with bass & warm arpeggios)
writeWavFile(path.join(publicDemoDir, "midnight-drift.wav"), 32, (t) => {
  const bpm = 120;
  const beat = (t * bpm) / 60;
  const chordNotes = [
    [220, 277.18, 329.63, 440], // A maj
    [196, 246.94, 293.66, 392], // G maj
    [174.61, 220, 261.63, 349.23], // F maj
    [164.81, 207.65, 246.94, 329.63], // E min
  ];
  const chordIdx = Math.floor((beat / 8) % 4);
  const currentChord = chordNotes[chordIdx];
  const arpIdx = Math.floor(beat * 4) % currentChord.length;
  const arpFreq = currentChord[arpIdx] * 2;

  // Bass
  const bassFreq = currentChord[0] / 2;
  const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.35;

  // Arp lead
  const arpEnv = Math.exp(-((beat * 4) % 1) * 3);
  const arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.25;

  // Warm pad
  let pad = 0;
  currentChord.forEach((f) => {
    pad += Math.sin(2 * Math.PI * f * t) * 0.08;
  });

  // Soft kick drum pulse on beats
  const kickPhase = beat % 1;
  const kick = kickPhase < 0.2 ? Math.sin(2 * Math.PI * (120 - kickPhase * 400) * kickPhase) * Math.exp(-kickPhase * 15) * 0.4 : 0;

  const left = bass + arp * 0.9 + pad + kick;
  const right = bass + arp * 0.7 + pad + kick;
  return [left * 0.6, right * 0.6];
});

// 2. Golden Hour Glow (Acoustic Ambient Warmth)
writeWavFile(path.join(publicDemoDir, "golden-hour-glow.wav"), 28, (t) => {
  const chordFrequencies = [
    [261.63, 329.63, 392.0, 523.25], // C maj
    [220.0, 261.63, 329.63, 440.0],  // A min
    [174.61, 220.0, 261.63, 349.23], // F maj
    [196.0, 246.94, 293.66, 392.0],  // G maj
  ];
  const measure = Math.floor((t / 3.5) % 4);
  const chord = chordFrequencies[measure];

  let l = 0, r = 0;
  chord.forEach((f, idx) => {
    const wobble = Math.sin(t * 1.5 + idx) * 0.02;
    l += Math.sin(2 * Math.PI * (f + wobble) * t) * 0.12;
    r += Math.cos(2 * Math.PI * (f - wobble) * t) * 0.12;
  });

  // Gentle bell chime melody
  const chimeNotes = [523.25, 659.25, 783.99, 987.77];
  const step = Math.floor(t * 2) % 4;
  const chimeEnv = Math.exp(-((t * 2) % 1) * 4);
  const chime = Math.sin(2 * Math.PI * chimeNotes[step] * t) * chimeEnv * 0.2;

  return [(l + chime * 0.8) * 0.7, (r + chime * 0.6) * 0.7];
});

// 3. Echoes of Silence (Neo-Soul Lo-Fi Groove)
writeWavFile(path.join(publicDemoDir, "echoes-of-silence.wav"), 30, (t) => {
  const bpm = 85;
  const beat = (t * bpm) / 60;
  // Electric Rhodes chords
  const chords = [
    [185.0, 233.08, 277.18, 349.23], // F#m7
    [164.81, 207.65, 246.94, 311.13], // D#m7
    [146.83, 185.0, 220.0, 277.18],  // Bm7
    [130.81, 164.81, 196.0, 246.94], // C#7
  ];
  const chordIdx = Math.floor((beat / 4) % 4);
  const chord = chords[chordIdx];

  let keys = 0;
  chord.forEach((f) => {
    keys += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * 0.12;
  });

  // Lo-Fi Sub Bass
  const sub = Math.sin(2 * Math.PI * (chord[0] / 2) * t) * 0.3;

  // Snare brush on beat 2 and 4
  const beatInBar = beat % 4;
  let snare = 0;
  if ((beatInBar > 1 && beatInBar < 1.3) || (beatInBar > 3 && beatInBar < 3.3)) {
    const sPhase = (beatInBar % 2) - 1;
    snare = (Math.random() * 2 - 1) * Math.exp(-sPhase * 18) * 0.15;
  }

  return [(keys + sub + snare) * 0.65, (keys + sub + snare) * 0.65];
});

// 4. Quantum Horizons (Deep Cyberpunk Electronic)
writeWavFile(path.join(publicDemoDir, "quantum-horizons.wav"), 26, (t) => {
  const bpm = 126;
  const beat = (t * bpm) / 60;
  const bassNotes = [110, 110, 130.81, 98]; // A, C, G
  const note = bassNotes[Math.floor(beat / 4) % bassNotes.length];

  // Sawtooth bass
  const saw = (2 * ((t * note) % 1) - 1) * 0.3;
  // Pluck synth
  const pluckFreq = note * 4;
  const pluck = Math.sin(2 * Math.PI * pluckFreq * t) * Math.exp(-(beat % 0.5) * 6) * 0.2;

  // Kick
  const kickTime = beat % 1;
  const kick = kickTime < 0.25 ? Math.sin(2 * Math.PI * (160 - kickTime * 450) * kickTime) * Math.exp(-kickTime * 12) * 0.45 : 0;

  return [(saw + pluck + kick) * 0.6, (saw + pluck + kick) * 0.6];
});

// 5. Velvet Horizons (Melodic Deep House)
writeWavFile(path.join(publicDemoDir, "velvet-horizons.wav"), 34, (t) => {
  const bpm = 122;
  const beat = (t * bpm) / 60;
  const roots = [130.81, 164.81, 146.83, 116.54]; // C, E, D, Bb
  const root = roots[Math.floor((beat / 4) % roots.length)];

  const bass = Math.sin(2 * Math.PI * root * t) * 0.35;
  const chordPad = (Math.sin(2 * Math.PI * root * 2 * t) + Math.sin(2 * Math.PI * root * 2.5 * t)) * 0.15;

  const hats = ((Math.random() * 2 - 1) * Math.exp(-(beat % 0.5) * 15)) * 0.08;

  return [(bass + chordPad + hats) * 0.7, (bass + chordPad + hats) * 0.7];
});

console.log("Demo audio files successfully generated!");
