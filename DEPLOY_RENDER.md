# Deploy len Render

## 1) Day code len GitHub
1. Commit code.
2. Push len repo GitHub.

## 2) Tao Web Service tren Render
1. Vao Render Dashboard.
2. Chon `New` -> `Blueprint`.
3. Chon repo vua push.
4. Render se doc file `render.yaml` va tao service tu dong.

## 3) Dien bien moi truong bat buoc
- `MONGO_URI` = chuoi ket noi MongoDB Atlas
- Mot trong 2 cai:
  - `OPENAI_API_KEY` (neu dung OpenAI), hoac
  - `HF_API_TOKEN` (neu dung Hugging Face)

## 4) Deploy
1. Bam `Apply`/`Deploy`.
2. Doi build xong.
3. Mo URL Render cap (`https://<ten-app>.onrender.com`).

## Ghi chu
- Render free co the ngu nguon khi khong co truy cap.
- Thu muc `uploads` tren Render la ephemeral (co the mat khi restart). Neu can luu file ben vung, nen doi sang Cloudinary/S3.
