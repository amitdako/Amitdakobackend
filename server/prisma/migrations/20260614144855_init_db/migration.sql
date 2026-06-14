-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "asset_hostname" TEXT NOT NULL,
    "asset_ip" TEXT NOT NULL,
    "source_ip" TEXT,
    "tags" TEXT NOT NULL,
    "user_id" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
