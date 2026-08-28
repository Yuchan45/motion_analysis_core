-- Add account roles and profile metadata without changing application endpoints.
CREATE TYPE "ProfileImageSourceType" AS ENUM ('MANAGED', 'EXTERNAL', 'PROVIDER', 'GENERATED');

CREATE TABLE "Role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileImage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceType" "ProfileImageSourceType" NOT NULL,
    "url" TEXT,
    "storageKey" TEXT,
    "provider" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "profileImageId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Role" ("name")
VALUES ('FREE'), ('PRO'), ('ADMIN');

ALTER TABLE "User"
    ADD COLUMN "roleId" UUID,
    ADD COLUMN "username" TEXT,
    ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET
    "roleId" = (SELECT "id" FROM "Role" WHERE "name" = 'FREE'),
    "username" = "email";

ALTER TABLE "User"
    ALTER COLUMN "roleId" SET NOT NULL,
    ALTER COLUMN "username" SET NOT NULL;

ALTER TABLE "Video"
    ALTER COLUMN "sizeBytes" TYPE BIGINT;

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE UNIQUE INDEX "UserProfile_profileImageId_key" ON "UserProfile"("profileImageId");

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_profileImageId_fkey"
    FOREIGN KEY ("profileImageId") REFERENCES "ProfileImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
