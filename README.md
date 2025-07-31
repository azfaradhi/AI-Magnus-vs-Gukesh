<h2 align="center">AI Magnus vs Gukesh</h2>
<p align="center">
  <img src="layar.webp" alt="Main" width="400">
</p>

## Description
Aplikasi ini adalah implementasi permainan catur sederhana yang berfokus pada skenario endgame Raja dan Pion Putih melawan Raja Hitam. Pemain dapat berinteraksi dengan AI Magnus (Putih) sebagai Gukesh (Hitam), atau mengamati AI bermain. Aplikasi ini dibangun menggunakan React (dengan Next.js) dan TypeScript, serta mengimplementasikan dua algoritma AI catur: Minimax dengan Alpha-Beta Pruning dan Monte Carlo Tree Search (MCTS).


## Fitur Utama

- Papan Catur Interaktif: Antarmuka papan catur 8x8 yang memungkinkan pemain (Gukesh/Hitam) memilih dan memindahkan Raja Hitam.

- AI Magnus (Putih): AI yang bermain sebagai bidak Putih, dapat dikonfigurasi untuk menggunakan salah satu dari dua algoritma:

- Minimax dengan Alpha-Beta Pruning: AI yang mencari gerakan terbaik dengan mengevaluasi posisi papan secara mendalam.

- Monte Carlo Tree Search (MCTS): AI yang menggunakan simulasi acak untuk menemukan gerakan yang menjanjikan.

- Deteksi Skak dan Skakmat/Kebuntuan: Aplikasi dapat mendeteksi dan menampilkan status "skak" pada raja serta mengumumkan "skakmat" atau "kebuntuan" ketika game berakhir.

- Analisis "Skakmat dalam X Langkah": Untuk algoritma Minimax, aplikasi dapat memprediksi dan menampilkan "Skakmat dalam X langkah" jika skakmat dapat dipaksakan dalam kedalaman pencarian AI.

- Promosi Pion Interaktif: Ketika pion putih mencapai baris terakhir, sebuah modal akan muncul, memungkinkan pengguna untuk memilih bidak promosi (Ratu, Benteng, Gajah, atau Kuda) untuk AI.

- Acak Papan: Menghasilkan posisi papan awal secara acak yang valid.

- Reset Permainan: Mengatur ulang game ke keadaan awal yang kosong.

- Kontrol Pemutaran (Playback): Fitur undo (mundur) dan redo (maju) untuk meninjau riwayat gerakan.

- Status Game Real-time: Menampilkan giliran saat ini, status game (misalnya "Game in progress"), dan pesan loading saat AI berpikir.

## Penjelasan Algoritma

1. **Minimax dengan Alpha-Beta Pruning**

   Minimax adalah algoritma pencarian pohon yang digunakan dalam permainan dua pemain dengan informasi sempurna (seperti catur). Algoritma ini bekerja dengan membangun "pohon permainan" yang merepresentasikan semua kemungkinan urutan gerakan hingga kedalaman tertentu.

   Tujuannya adalah pemain yang memaksimalkan (AI Magnus / Putih) bertujuan untuk memaksimalkan skor evaluasi posisi.

   Fungsi Evaluasi (evaluateBoard di backend/minimax.ts) adalah inti dari "kecerdasan" AI Minimax. Fungsi ini memberikan skor numerik pada setiap posisi papan, mencerminkan seberapa baik posisi tersebut bagi pemain Putih.

   Alpha-Beta Pruning: Ini adalah optimasi untuk algoritma Minimax. Ia secara cerdas "memangkas" cabang-cabang pohon pencarian yang tidak mungkin memengaruhi keputusan akhir. Ini secara signifikan mengurangi jumlah posisi yang perlu dievaluasi, membuat pencarian lebih cepat dan memungkinkan AI untuk mencari pada kedalaman yang lebih besar.

2. **Monte Carlo Tree Search**

   MCTS beroperasi dalam siklus empat fase:

   Selection (selectChild): Dimulai dari root node, algoritma memilih serangkaian child nodes yang paling menjanjikan (menggunakan formula UCB1) hingga mencapai node yang belum sepenuhnya dieksplorasi atau terminal node.

   Expansion (expandNode): Dari selected node, satu atau lebih child nodes baru ditambahkan ke pohon untuk gerakan yang belum dieksplorasi.

   Simulation (simulateGame): Dari newly expanded node, simulasi permainan acak (sering disebut rollout) dimainkan hingga game berakhir (skakmat, kebuntuan, atau batas langkah). Hasilnya (menang, kalah, seri) dicatat.

   Backpropagation (backpropagate): Hasil simulasi disebarkan kembali ke atas pohon, memperbarui statistik (jumlah kunjungan dan kemenangan) dari semua node yang terlibat dalam jalur simulasi.



## Cara Menjalankan Aplikasi

1. Instal Dependensi

   ```bash
   npm install
   ```
2. Jalankan Aplikasi

   ```bash
   npm run dev
   ```

3. Buka http://localhost:3000 di browser, atau dapat langsung mengakses link deployment.