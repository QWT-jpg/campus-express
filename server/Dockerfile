FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install mysql2
COPY . .
RUN npx prisma generate
EXPOSE 3000
ENV PORT=3000
CMD node -e "const m=require('mysql2/promise');(async()=>{const u=new URL(process.env.DATABASE_URL.replace('mysql://','http://'));const n=u.pathname.slice(1);const c=await m.createConnection({host:u.hostname,port:u.port||3306,user:decodeURIComponent(u.username),password:decodeURIComponent(u.password)});await c.execute('CREATE DATABASE IF NOT EXISTS \\`'+n+'\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await c.end()})().catch(()=>{})" && npx prisma db push && node prisma/seed.js && node src/app.js
